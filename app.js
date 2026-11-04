// app.js
// The main Express application for the todo backend.
//
// MIDDLEWARE ORDER MATTERS. Express runs everything top to bottom:
//   1. express.json()   -> parse JSON bodies first, so routes can read req.body
//   2. routes           -> the real work
//   3. not-found        -> catches anything no route handled (404)
//   4. error-handler    -> catches anything that called next(error) (500)
// Analogy: a process line. Filter first, then the equipment, then the
// overflow drain, then the emergency relief at the very end.

const express = require("express");
const pool = require("./db/pg-pool"); // PostgreSQL connection pool
const timeRouter = require("./routes/timeRoutes");
const userRouter = require("./routes/userRoutes");
const taskRouter = require("./routes/taskRoutes");
const authMiddleware = require("./middleware/auth");
const notFound = require("./middleware/not-found");
const errorHandler = require("./middleware/error-handler");

// Users and tasks now live in PostgreSQL (see db/pg-pool.js).
// global.user_id still remembers who is logged on (replaced in a later lesson).
global.user_id = null;

const app = express();

// 1. Built-in middleware: reads JSON request bodies into req.body.
app.use(express.json());

// 2. Routes

// Health check: confirms the app can actually reach the database.
// Analogy: a pressure gauge on the line to the database.
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "connected" });
  } catch (err) {
    res.status(500).json({ message: `db not connected, error: ${ err.message }` });
  }
});

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.post("/testpost", (req, res) => {
  res.status(200).json({
    message: "POST route works",
  });
});

app.use("/api", timeRouter); // /api/time, /api/echo (from Week 2)
app.use("/api/users", userRouter); // /api/users/register, /logon, /logoff
app.use("/api/tasks", authMiddleware, taskRouter); // task routes (PROTECTED)

// 3. Not-found middleware: AFTER all real routes.
app.use(notFound);

// 4. Error-handler middleware: LAST.
app.use(errorHandler);

const port = process.env.PORT || 3000;

// Check for startup errors (like the port already in use) before announcing success.
const server = app.listen(port, (error) => {
  if (error) {
    if (error.code === "EADDRINUSE") {
      console.error(`Port ${port} is already in use.`);
    } else {
      console.error("Server startup error:", error);
    }
    process.exit(1);
    return;
  }

  console.log(`Server is listening on port ${port}...`);
});

// Shut down cleanly on Ctrl-C or a stop signal.
let isShuttingDown = false;

async function shutdown(code = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log("Shutting down gracefully...");

  try {
    await new Promise((resolve, reject) => {
      server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    console.log("HTTP server closed.");

    // Close all PostgreSQL connections after the HTTP server has stopped.
    await pool.end();
    console.log("PostgreSQL connection pool closed.");
  } catch (err) {
    console.error("Error during shutdown:", err);
    code = 1;
  } finally {
    process.exit(code);
  }
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

module.exports = { app, server };
