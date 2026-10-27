// controllers/userController.js
// Handles user registration, logon, and logoff.
//
// For now, users live in global.users (a temporary in-memory "database").
// Analogy: a clipboard sign-in sheet at the plant gate. It works for today,
// but it's wiped when the shift ends (when the server restarts). A real
// database (PostgreSQL) replaces it later in the course.

// POST /api/users/register
function register(req, res) {
  const { name, email, password } = req.body;

  const newUser = { name, email, password };
  global.users.push(newUser); // add to the sign-in sheet
  global.user_id = newUser; // the new user is now "logged on"

  // 201 = Created. Send back name and email, but NEVER the password.
  res.status(201).json({ name: newUser.name, email: newUser.email });
}

// POST /api/users/logon
function logon(req, res) {
  const { email, password } = req.body;

  // Look for a user whose email AND password both match.
  const user = global.users.find(
    (u) => u.email === email && u.password === password,
  );

  if (!user) {
    // 401 = Unauthorized: wrong credentials.
    return res.status(401).json({ message: "Authentication failed." });
  }

  global.user_id = user; // remember who is logged on
  res.status(200).json({ name: user.name, email: user.email });
}

// POST /api/users/logoff
function logoff(req, res) {
  global.user_id = null; // nobody is logged on now
  res.status(200).json({ message: "Logged off." });
}

module.exports = { register, logon, logoff };
