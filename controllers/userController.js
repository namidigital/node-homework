// controllers/userController.js
// Handles user registration, logon, and logoff.
//
// Users still live in global.users (a temporary in-memory "database").
// New this week:
//   1. Joi validation: reject bad data at the door (400).
//   2. Password hashing: we NEVER store the real password.

const crypto = require("crypto"); // built into Node
const util = require("util");
const { userSchema } = require("../validation/userSchema");

// crypto.scrypt uses callbacks; promisify lets us use async/await with it.
const scrypt = util.promisify(crypto.scrypt);

// Turn a password into "salt:hash".
// Analogy: a one-way meat grinder. You can check whether the same steak goes
// in by grinding it again and comparing, but you can't un-grind the burger.
// The random salt means two users with the same password get different hashes.
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
  return crypto.timingSafeEqual(keyBuffer, derivedKey); // safe comparison
}

// POST /api/users/register
async function register(req, res) {
  if (!req.body) req.body = {};

  // 1. Validate first. error = what failed; value = the cleaned-up data.
  const { error, value } = userSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ message: error.message });
  }

  // 2. Don't allow the same email twice.
  if (global.users.find((u) => u.email === value.email)) {
    return res.status(400).json({ message: "That email is already registered." });
  }

  // 3. Hash the password, then store the user WITHOUT the plain password.
  const hashedPassword = await hashPassword(value.password);
  const newUser = { email: value.email, name: value.name, hashedPassword };

  global.users.push(newUser);
  global.user_id = newUser; // the new user is now "logged on"

  // 201 = Created. Never send back the password or the hash.
  res.status(201).json({ name: newUser.name, email: newUser.email });
}

// POST /api/users/logon
async function logon(req, res) {
  if (!req.body) req.body = {};
  const { email, password } = req.body;

  // Find the user by email (stored emails are lowercase, so match that).
  const user = global.users.find(
    (u) => u.email === String(email || "").trim().toLowerCase(),
  );

  // Only compare hashes if we found a user and a password was sent.
  const goodCredentials =
    user && password && (await comparePassword(password, user.hashedPassword));

  if (!goodCredentials) {
    return res.status(401).json({ message: "Authentication failed." });
  }

  global.user_id = user; // remember who is logged on
  res.status(200).json({ name: user.name, email: user.email });
}

// POST /api/users/logoff
async function logoff(req, res) {
  global.user_id = null; // nobody is logged on now
  res.status(200).json({ message: "Logged off." });
}

module.exports = { register, logon, logoff };
