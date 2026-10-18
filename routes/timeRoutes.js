// routes/timeRoutes.js
// The router maps "method + path" to a controller function.
// Analogy: a switchboard. It doesn't do the work; it just connects
// each incoming call to the right department (controller).

const express = require("express");
const timeController = require("../controllers/timeController");

const router = express.Router();

router.get("/time", timeController.getTime);
router.post("/echo", timeController.echoBody);

module.exports = router;
