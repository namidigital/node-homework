// middleware/not-found.js
// Runs only if NO route above it in app.js matched the request.
// Analogy: the "wrong address" desk. Mail that no department claimed ends up here.

function notFound(req, res) {
  res.status(404).json({
    message: `No route found for ${req.method} ${req.path}`,
  });
}

module.exports = notFound;
