// controllers/userController.js
// Handles user registration, logon, and logoff.
//
// NEW THIS WEEK: users live in the PostgreSQL "users" table instead of
// global.users. Analogy: we moved from a clipboard sign-in sheet (wiped every
// shift change) to the plant's permanent logbook (survives a restart).
// global.user_id still remembers who is logged on (replaced in a later lesson).

const crypto = require("crypto"); // built into Node
const util = require("util");
const pool = require("../db/pg-pool");
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
  value.hashed_password = await hashPassword(value.password);

  // 3. INSERT into the database. $1, $2, $3 are placeholders (a "parameterized
  //    query"): pg fills them in safely, which blocks SQL injection.
  let result = null;
  try {
    result = await pool.query(
      `INSERT INTO users (email, name, hashed_password)
       VALUES ($1, $2, $3) RETURNING id, email, name`,
      [value.email, value.name, value.hashed_password],
    );
  } catch (e) {
    // 23505 = the UNIQUE constraint on email was violated (already registered).
    if (e.code === "23505") {
      return res.status(400).json({ message: "That email is already registered." });
    }
    return next(e); // any other database error goes to the error handler
  }

  const user = result.rows[0];
  global.user_id = user.id; // the new user is now "logged on"

  // 201 = Created. Only name and email go back: never the id or the hash.
  res.status(201).json({ name: user.name, email: user.email });
}

// POST /api/users/logon
async function logon(req, res) {
  if (!req.body) req.body = {};
  const { email, password } = req.body;

  // Look the user up in the database (emails are stored lowercase).
  const result = await pool.query("SELECT * FROM users WHERE email = $1", [
    String(email || "").trim().toLowerCase(),
  ]);

  // No rows = no such user. Otherwise, check the password against the hash.
  const user = result.rows[0];
  const goodCredentials =
    user && password && (await comparePassword(password, user.hashed_password));

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
