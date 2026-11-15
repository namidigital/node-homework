// controllers/userController.js
// Handles user registration, logon, and logoff.
//
// NEW THIS WEEK: we talk to the "users" table through Prisma instead of raw SQL.
// Analogy: same permanent logbook, but now a clerk (Prisma) writes the entries
// for us from a standard form, so we can't misspell a column or forget a $1.
// global.user_id still remembers who is logged on (replaced in a later lesson).

const crypto = require("crypto"); // built into Node
const util = require("util");
const prisma = require("../db/prisma");
const { userSchema } = require("../validation/userSchema");

// crypto.scrypt uses callbacks; promisify lets us use async/await with it.
const scrypt = util.promisify(crypto.scrypt);

// Turn a password into "salt:hash" (one-way, like a meat grinder).
async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

// Hash the submitted password with the SAME salt and compare the results.
async function comparePassword(inputPassword, storedHash) {
  const [salt, key] = storedHash.split(":");
  const keyBuffer = Buffer.from(key, "hex");
  const derivedKey = await scrypt(inputPassword, salt, 64);
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

// POST /api/users/register
async function register(req, res, next) {
  if (!req.body) req.body = {};

  // 1. Validate first. error = what failed; value = the cleaned-up data.
  const { error, value } = userSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      message: "Validation failed",
      details: error.details,
    });
  }

  // 2. Hash the password. The plain password is never stored.
  value.hashedPassword = await hashPassword(value.password);
  delete value.password;
  const { name, email, hashedPassword } = value;

  // 3. A TRANSACTION: create the user AND 3 welcome tasks as one unit.
  //    Either everything is saved, or (if anything fails) nothing is.
  //    Analogy: a lockout/tagout. You don't leave a job half-isolated;
  //    every step completes, or you back everything out.
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Inside the transaction, use tx (not prisma) so it's all one unit.
      const newUser = await tx.user.create({
        data: { email, name, hashedPassword },
        select: { id: true, email: true, name: true, createdAt: true },
      });

      const welcomeTaskData = [
        { title: "Complete your profile", userId: newUser.id, priority: "medium" },
        { title: "Add your first task", userId: newUser.id, priority: "high" },
        { title: "Explore the app", userId: newUser.id, priority: "low" },
      ];
      await tx.task.createMany({ data: welcomeTaskData });

      // createMany only returns a count, so fetch the tasks to send back.
      const welcomeTasks = await tx.task.findMany({
        where: {
          userId: newUser.id,
          title: { in: welcomeTaskData.map((t) => t.title) },
        },
        select: {
          id: true,
          title: true,
          isCompleted: true,
          userId: true,
          priority: true,
        },
      });

      return { user: newUser, welcomeTasks };
    });

    // Store the user ID globally for session management (not secure for production)
    global.user_id = result.user.id;

    res.status(201).json({
      user: result.user,
      welcomeTasks: result.welcomeTasks,
      transactionStatus: "success",
    });
  } catch (err) {
    // P2002 = unique constraint violation: the email is already registered.
    // The transaction rolled back, so no tasks were created either.
    if (err.code === "P2002") {
      return res.status(400).json({ error: "Email already registered" });
    }
    return next(err); // the error handler takes care of other errors
  }
}

// POST /api/users/logon
async function logon(req, res) {
  if (!req.body) req.body = {};
  let { email, password } = req.body;

  // Joi lowercases emails at registration, and Prisma findUnique can't do a
  // case-insensitive search, so lowercase here too ("Jim@Sample.com" still works).
  email = String(email || "").trim().toLowerCase();
  // Selective loading: only the fields logon needs. The hash is read here
  // to check the password, but it is never sent back to the client.
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, hashedPassword: true },
  });

  // null = no such user. Otherwise, check the password against the hash.
  const goodCredentials =
    user && password && (await comparePassword(password, user.hashedPassword));

  if (!goodCredentials) {
    return res.status(401).json({ message: "Authentication failed." });
  }

  global.user_id = user.id; // remember who is logged on (now the database id)
  res.status(200).json({ name: user.name, email: user.email });
}

// POST /api/users/logoff (no change needed)
async function logoff(req, res) {
  global.user_id = null; // nobody is logged on now
  res.status(200).json({ message: "Logged off." });
}

module.exports = { register, logon, logoff };
