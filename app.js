// app.js
// The main Express application. Compare this to assignment2/sampleHTTP.js:
// Express handles the routing, headers, and JSON parsing that we had to
// do by hand there. Analogy: going from manual valves to an automated
// control system.

const express = require("express");
const timeRouter = require("./routes/timeRoutes");

const app = express();

// Middleware that reads JSON request bodies and puts them on req.body.
// (In sampleHTTP.js we had to collect "data" chunks and JSON.parse ourselves.)
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.post("/testpost", (req, res) => {
  res.status(200).json({
    message: "POST route works",
  });
});

// Mount the time routes under /api, so /time becomes /api/time, etc.
app.use("/api", timeRouter);

// OPTIONAL Task 8: catch-all for anything not handled above.
// Must come AFTER the real routes. Express 5 needs "/{*splat}", not "*".
app.all("/{*splat}", (req, res) => {
  res.status(404).json({
    message: `No route found for ${req.method} ${req.path}`,
  });
});

const port = process.env.PORT || 3000;

// OPTIONAL Task 9: check for startup errors (like the port already in use)
// before announcing success.
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

// OPTIONAL Task 9: shut down cleanly on Ctrl-C or a stop signal.
// Analogy: a controlled shutdown procedure instead of just pulling the breaker.
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
