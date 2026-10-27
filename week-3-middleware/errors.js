// week-3-middleware/errors.js
// Custom error classes. Each one is a normal Error that ALSO carries
// the HTTP status code that fits the problem.
// Analogy: color-coded alarm tags. The error handler reads the tag
// (statusCode) and knows what kind of response to send.

class ValidationError extends Error {
  constructor(message) {
    super(message); // hand the message to the built-in Error
    this.name = "ValidationError";
    this.statusCode = 400; // Bad Request: the client sent incomplete data
  }
}

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = "NotFoundError";
    this.statusCode = 404; // Not Found: the thing they asked for isn't here
  }
}

class UnauthorizedError extends Error {
  constructor(message) {
    super(message);
    this.name = "UnauthorizedError";
    this.statusCode = 401; // Unauthorized: not logged in / bad credentials
  }
}

module.exports = {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
};
