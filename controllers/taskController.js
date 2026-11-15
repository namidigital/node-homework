// controllers/taskController.js
// Create, read, update, and delete tasks for the LOGGED-ON user only.
//
// NEW THIS WEEK: Prisma Client methods replace raw SQL. Every lookup filters on
// BOTH the task id AND userId, so one user can never see or change another
// user's tasks (authorization).
//
// Naming note: Prisma maps the database column is_completed to the JavaScript
// field isCompleted (see @map in prisma/schema.prisma), so requests, Joi, and
// responses all use camelCase now. userId is never returned.

const prisma = require("../db/prisma");
const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");

// The fields we send back to the client (like the column list after SELECT).
const TASK_FIELDS = { id: true, title: true, isCompleted: true };

// Turn "7" into 7. Returns null if it isn't a valid number.
function getTaskId(req) {
  const taskId = parseInt(req.params?.id);
  return taskId ? taskId : null;
}

// POST /api/tasks
async function create(req, res, next) {
  if (!req.body) req.body = {};
  const { error, value } = taskSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ message: error.message });
  }

  try {
    // Same pattern as register: data in, chosen fields out.
    const task = await prisma.task.create({
      data: { ...value, userId: global.user_id },
      select: TASK_FIELDS,
    });
    res.status(201).json(task);
  } catch (err) {
    return next(err);
  }
}

// GET /api/tasks
async function index(req, res, next) {
  try {
    const tasks = await prisma.task.findMany({
      where: {
        userId: global.user_id, // only the tasks for this user!
      },
      select: { title: true, isCompleted: true, id: true },
      orderBy: { id: "asc" },
    });

    if (tasks.length === 0) {
      return res.status(404).json({ message: "No tasks found for this user." });
    }

    res.status(200).json(tasks);
  } catch (err) {
    return next(err);
  }
}

// GET /api/tasks/:id
async function show(req, res, next) {
  const id = getTaskId(req);
  if (!id) {
    return res.status(400).json({ message: "The task ID passed is not valid." });
  }

  try {
    // findUnique returns null when nothing matches (it does not throw).
    const task = await prisma.task.findUnique({
      where: { id, userId: global.user_id },
      select: TASK_FIELDS,
    });

    if (!task) {
      // 404 (not 403) so we don't reveal that another user's task exists.
      return res.status(404).json({ message: "That task was not found." });
    }

    res.status(200).json(task);
  } catch (err) {
    return next(err);
  }
}

// PATCH /api/tasks/:id
async function update(req, res, next) {
  if (!req.body) req.body = {};

  // 1. Validate the patch body first, so bad data never reaches the database.
  const { error, value } = patchTaskSchema.validate(req.body, {
    abortEarly: false,
  });
  if (error) {
    return res.status(400).json({ message: error.message });
  }

  // 2. Parse the id.
  const id = getTaskId(req);
  if (!id) {
    return res.status(400).json({ message: "The task ID passed is not valid." });
  }

  // 3. Update only if the task belongs to this user. No more hand-building
  //    "SET title = $1, ..." strings: Prisma does that from the value object.
  try {
    const task = await prisma.task.update({
      data: value,
      where: {
        id,
        userId: global.user_id,
      },
      select: { title: true, isCompleted: true, id: true },
    });
    res.status(200).json(task);
  } catch (err) {
    // P2025 = "record not found" (wrong id, or it belongs to someone else).
    if (err.code === "P2025") {
      return res.status(404).json({ message: "The task was not found." });
    }
    return next(err); // pass other errors to the global error handler
  }
}

// DELETE /api/tasks/:id
async function deleteTask(req, res, next) {
  const id = getTaskId(req);
  if (!id) {
    return res.status(400).json({ message: "The task ID passed is not valid." });
  }

  try {
    // delete returns the removed row, so we can send it back.
    const task = await prisma.task.delete({
      where: { id, userId: global.user_id },
      select: TASK_FIELDS,
    });
    res.status(200).json(task);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "The task was not found." });
    }
    return next(err);
  }
}

module.exports = { create, index, show, update, deleteTask };
