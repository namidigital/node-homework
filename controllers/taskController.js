// controllers/taskController.js
// Create, read, update, and delete tasks for the LOGGED-ON user only.
//
// Two different questions:
//   Authentication (auth.js): "Is anyone logged in?"
//   Authorization (here):     "Does THIS task belong to THAT user?"
// Every lookup checks BOTH the task id AND the owner's email (userId).

const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");

// Temporary ID generator: returns 1, 2, 3, ... (a database will do this later).
const taskCounter = (() => {
  let lastTaskNumber = 0;
  return () => {
    lastTaskNumber += 1;
    return lastTaskNumber;
  };
})();

// Copy a task WITHOUT userId. userId is internal bookkeeping the client
// doesn't need. This doesn't change the stored task, only the response copy.
function sanitize(task) {
  const { userId, ...sanitizedTask } = task; // eslint-disable-line no-unused-vars
  return sanitizedTask;
}

// Turn "7" into 7. Returns null if it isn't a valid number.
function getTaskId(req) {
  const taskId = parseInt(req.params?.id);
  return taskId ? taskId : null;
}

// POST /api/tasks
async function create(req, res) {
  if (!req.body) req.body = {};
  const { error, value } = taskSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ message: error.message });
  }

  // Use the validated value (Joi adds isCompleted: false if it was missing).
  const newTask = { id: taskCounter(), userId: global.user_id.email, ...value };
  global.tasks.push(newTask);

  res.status(201).json(sanitize(newTask));
}

// GET /api/tasks
async function index(req, res) {
  // Only THIS user's tasks, never everyone's.
  const userTasks = global.tasks.filter(
    (task) => task.userId === global.user_id.email,
  );

  if (userTasks.length === 0) {
    return res.status(404).json({ message: "No tasks found for this user." });
  }

  res.status(200).json(userTasks.map(sanitize));
}

// GET /api/tasks/:id
async function show(req, res) {
  const taskId = getTaskId(req);
  if (!taskId) {
    return res.status(400).json({ message: "The task ID passed is not valid." });
  }

  const task = global.tasks.find(
    (t) => t.id === taskId && t.userId === global.user_id.email,
  );
  if (!task) {
    // 404 (not 403) so we don't reveal that another user's task exists.
    return res.status(404).json({ message: "That task was not found." });
  }

  res.status(200).json(sanitize(task));
}

// PATCH /api/tasks/:id
async function update(req, res) {
  if (!req.body) req.body = {};

  // 1. Validate the patch body first, so bad data never gets written.
  const { error, value } = patchTaskSchema.validate(req.body, {
    abortEarly: false,
  });
  if (error) {
    return res.status(400).json({ message: error.message });
  }

  // 2. Parse the id.
  const taskId = getTaskId(req);
  if (!taskId) {
    return res.status(400).json({ message: "The task ID passed is not valid." });
  }

  // 3. Find a task this user owns.
  const task = global.tasks.find(
    (t) => t.id === taskId && t.userId === global.user_id.email,
  );
  if (!task) {
    return res.status(404).json({ message: "That task was not found." });
  }

  // 4. Merge ONLY the sent fields into the stored task (a partial update).
  // Analogy: replacing one gasket, not swapping out the whole pump.
  Object.assign(task, value);

  res.status(200).json(sanitize(task));
}

// DELETE /api/tasks/:id
async function deleteTask(req, res) {
  const taskId = getTaskId(req);
  if (!taskId) {
    return res.status(400).json({ message: "The task ID passed is not valid." });
  }

  // findIndex gives the array position, which splice() needs.
  const taskIndex = global.tasks.findIndex(
    (t) => t.id === taskId && t.userId === global.user_id.email,
  );
  if (taskIndex === -1) {
    return res.status(404).json({ message: "That task was not found." });
  }

  const deletedTask = sanitize(global.tasks[taskIndex]); // copy first
  global.tasks.splice(taskIndex, 1); // then remove it from the list

  res.status(200).json(deletedTask);
}

module.exports = { create, index, show, update, deleteTask };
