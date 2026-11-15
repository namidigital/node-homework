// controllers/taskController.js
// Create, read, update, and delete tasks for the LOGGED-ON user only.
//
// NEW THIS WEEK: Prisma Client methods replace raw SQL. Every lookup filters on
// BOTH the task id AND userId, so one user can never see or change another
// user's tasks (authorization).
//
// NEW IN WEEK 7: priority field, pagination + search + sorting on index,
// eager loading of the task's User, and bulk create with createMany.
//
// Naming note: Prisma maps the database column is_completed to the JavaScript
// field isCompleted (see @map in prisma/schema.prisma), so requests, Joi, and
// responses all use camelCase now. userId is never returned.

const prisma = require("../db/prisma");
const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");

// The fields we send back to the client (like the column list after SELECT).
const TASK_FIELDS = { id: true, title: true, isCompleted: true, priority: true };

// Eager loading: the task fields PLUS the owner's name and email, fetched in
// the same call. Avoids the "N+1 problem" (1 query for tasks + 1 per task for
// its user). Analogy: grabbing the whole parts kit in one trip to the storeroom.
const TASK_WITH_USER = {
  id: true,
  title: true,
  isCompleted: true,
  priority: true,
  createdAt: true,
  User: {
    select: {
      name: true,
      email: true,
    },
  },
};

// Read ?page=&limit= and check them. Returns { error } or { page, limit, skip }.
function getPaging(query) {
  const page = query.page === undefined ? 1 : parseInt(query.page);
  const limit = query.limit === undefined ? 10 : parseInt(query.limit);
  if (!Number.isInteger(page) || page < 1) {
    return { error: "page must be a whole number of 1 or more." };
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return { error: "limit must be a whole number from 1 to 100." };
  }
  return { page, limit, skip: (page - 1) * limit };
}

// Optional sorting: ?sortBy=title&sortDirection=asc. Only known fields allowed.
function getOrderBy(query) {
  const validSortFields = ["title", "priority", "createdAt", "id", "isCompleted"];
  const sortBy = query.sortBy || "createdAt";
  const sortDirection = query.sortDirection === "asc" ? "asc" : "desc";

  if (validSortFields.includes(sortBy)) {
    return { [sortBy]: sortDirection };
  }
  return { createdAt: "desc" }; // default fallback
}

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

// POST /api/tasks/bulk  body: { "tasks": [ {...}, {...} ] }
// Validates EVERY task first; if any one is bad, nothing is inserted.
async function bulkCreate(req, res, next) {
  const { tasks } = req.body || {};

  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
    return res.status(400).json({
      error: "Invalid request data. Expected an array of tasks.",
    });
  }

  const validTasks = [];
  for (const task of tasks) {
    const { error, value } = taskSchema.validate(task);
    if (error) {
      return res.status(400).json({
        error: "Validation failed",
        details: error.details,
      });
    }
    validTasks.push({
      title: value.title,
      isCompleted: value.isCompleted || false,
      priority: value.priority || "medium",
      userId: global.user_id,
    });
  }

  // createMany = one INSERT with many rows, instead of many round trips.
  try {
    const result = await prisma.task.createMany({
      data: validTasks,
      skipDuplicates: false,
    });

    res.status(201).json({
      message: "Bulk task creation successful",
      tasksCreated: result.count,
      totalRequested: validTasks.length,
    });
  } catch (err) {
    return next(err);
  }
}

// GET /api/tasks?page=1&limit=10&find=meeting&sortBy=title&sortDirection=asc
async function index(req, res, next) {
  if (!req.query) req.query = {};
  const paging = getPaging(req.query);
  if (paging.error) {
    return res.status(400).json({ message: paging.error });
  }
  const { page, limit, skip } = paging;

  // Only this user's tasks, optionally filtered by title.
  const whereClause = { userId: global.user_id };
  if (req.query.find) {
    whereClause.title = {
      contains: req.query.find, // matches %find%
      mode: "insensitive", // case-insensitive (ILIKE in PostgreSQL)
    };
  }

  try {
    // Pagination: skip the earlier pages, take one page's worth.
    // Analogy: reading a long logbook one page at a time.
    const tasks = await prisma.task.findMany({
      where: whereClause,
      select: TASK_WITH_USER,
      skip: skip,
      take: limit,
      orderBy: getOrderBy(req.query),
    });

    // Same where clause, so the total matches the filter.
    const totalTasks = await prisma.task.count({
      where: whereClause,
    });

    if (totalTasks === 0) {
      return res.status(404).json({ message: "No tasks found for this user." });
    }

    const pagination = {
      page,
      limit,
      total: totalTasks,
      pages: Math.ceil(totalTasks / limit),
      hasNext: page * limit < totalTasks,
      hasPrev: page > 1,
    };

    res.status(200).json({ tasks, pagination });
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
      select: TASK_WITH_USER,
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
      select: { title: true, isCompleted: true, id: true, priority: true },
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

module.exports = { create, index, show, update, deleteTask, bulkCreate };
