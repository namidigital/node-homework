// middleware/error-handler.js
// Express recognizes an error handler by its FOUR parameters: (err, req, res, next).
// Anything that calls next(error) skips ahead to here.
// Analogy: the emergency shutdown system. Normal operations skip it,
// but when something trips, everything routes here for a safe response.

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err.code === "ECONNREFUSED" && err.port === 5432) { // the postgresql port
    console.log("The database connection was refused.  Is your database service running?");
  }

  console.error(err); // full details go in the server log, for developers

  // The client only gets a safe, generic message (no stack traces).
  res.status(500).json({
    message: "Internal server error.",
  });
}

module.exports = errorHandler;
