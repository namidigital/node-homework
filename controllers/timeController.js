// controllers/timeController.js
// Controllers hold the "what do we actually do" logic for each route.
// Analogy: the routes file is the switchboard that sends a call to the
// right department; the controller is the department that does the work.

// GET /api/time -> reply with the current time
function getTime(req, res) {
  res.status(200).json({
    time: new Date().toString(),
  });
}

// POST /api/echo -> reply with whatever JSON the client sent
// (express.json() in app.js already parsed it into req.body for us)
function echoBody(req, res) {
  res.status(200).json({
    weReceived: req.body,
  });
}

module.exports = {
  getTime,
  echoBody,
};
