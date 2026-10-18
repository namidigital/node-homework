const express = require("express");
const path = require("path");
const { randomUUID } = require("crypto"); // built into Node, no install needed
const dogsRouter = require("./routes/dogs");

const app = express();

// Middleware runs top to bottom, like stations on an assembly line.
// Each station does its job, then calls next() to pass the request along.

// 1. Request ID: stamp every request with a unique ID, like a work order number,
//    so we can track it through the logs.
app.use((req, res, next) => {
  req.requestId = randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  next();
});

// 2. Logging: [timestamp]: METHOD PATH (requestId)
app.use((req, res, next) => {
  console.log(
    `[${new Date().toISOString()}]: ${req.method} ${req.path} (${req.requestId})`,
  );
  next();
});

// 3. (Optional) Security headers on every response.
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

// 4. Built-in: parse JSON bodies (with an optional 1mb size limit).
app.use(express.json({ limit: "1mb" }));

// 5. Built-in: serve files from public/ (so /images/dachshund.png works).
//    path.join(__dirname, ...) makes it work no matter where you run node from.
app.use(express.static(path.join(__dirname, "public")));

// 6. (Optional) Content-Type validation: POST requests must send JSON.
app.use((req, res, next) => {
  if (req.method === "POST" && !req.is("application/json")) {
    return res.status(400).json({
      error: "Content-Type must be application/json",
      requestId: req.requestId,
    });
  }
  next();
});

app.use("/", dogsRouter);// Do not remove this line

// 7. 404 handler: no route matched.
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    requestId: req.requestId,
  });
});

// 8. Error handler (4 parameters): uses the error's statusCode if it has one.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  if (statusCode >= 400 && statusCode < 500) {
    console.warn(`WARN: ${err.name} - ${err.message}`); // client problem
  } else {
    console.error(`ERROR: ${err.name} - ${err.message}`); // server problem
  }

  res.status(statusCode).json({
    error: statusCode === 500 ? "Internal Server Error" : err.message,
    requestId: req.requestId,
  });
});

if (require.main === module) {
  app.listen(3000, () => {
    console.log("Dog rescue app is listening on port 3000...");
  });
}

module.exports = app;
