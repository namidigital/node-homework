// routes/userRoutes.js
// The switchboard for user routes. app.js mounts this at /api/users,
// so "/register" here becomes "/api/users/register" for the client.

const express = require("express");
const { register, logon, logoff } = require("../controllers/userController");

const router = express.Router();

router.post("/register", register);
router.post("/logon", logon);
router.post("/logoff", logoff);

module.exports = router;
