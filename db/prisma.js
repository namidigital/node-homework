// db/prisma.js
// The shared Prisma Client: replaces the pg pool as our database connection.
// Analogy: instead of writing every work order by hand (raw SQL), we now
// hand a standard form to a dispatcher (Prisma) who writes the SQL for us.
const { PrismaClient } = require("@prisma/client");

let opts;
if (!process.env.NODE_ENV || process.env.NODE_ENV === "development") {
  opts = { log: ["query"] };
} else {
  opts = {};
}

const prisma = new PrismaClient(opts);

module.exports = prisma;
