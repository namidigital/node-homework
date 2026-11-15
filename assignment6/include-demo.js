// assignment6/include-demo.js
// Video demo: how Prisma follows the User <-> Task relationship.
// Run with: node assignment6/include-demo.js
require("dotenv").config();
const prisma = require("../db/prisma");

async function main() {
  // A user WITH their tasks (follows User.Task, the one-to-many side)
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, Task: { select: { id: true, title: true, isCompleted: true } } },
  });
  console.log("Users with their tasks:");
  console.dir(users, { depth: null });

  // Tasks WITH their owner (follows Task.User, the many-to-one side)
  const tasks = await prisma.task.findMany({
    include: { User: { select: { name: true } } },
  });
  console.log("Tasks with their owner:");
  console.dir(tasks, { depth: null });
}

main().finally(() => prisma.$disconnect());
