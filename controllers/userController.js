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

  // 3. Create the user. Prisma writes the INSERT for us (and parameterizes it).
  //    select = which columns to send back (like RETURNING in SQL).
  let user = null;
  try {
    user = await prisma.user.create({
      data: { name, email, hashedPassword },
      select: { name: true, email: true, id: true },
    });
  } catch (err) {
    // P2002 = Prisma's code for a unique constraint violation (email taken).
    if (err.name === "PrismaClientKnownRequestError" && err.code === "P2002") {
      return res.status(400).json({ message: "That email is already registered." });
    }
    return next(err); // any other database error goes to the error handler
  }

  global.user_id = user.id; // the new user is now "logged on"

  // 201 = Created. Only name and email go back: never the id or the hash.
  res.status(201).json({ name: user.name, email: user.email });
}

// POST /api/users/logon
async function logon(req, res) {
  if (!req.body) req.body = {};
  let { email, password } = req.body;

  // Joi lowercases emails at registration, and Prisma findUnique can't do a
  // case-insensitive search, so lowercase here too ("Jim@Sample.com" still works).
  email = String(email || "").trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

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
