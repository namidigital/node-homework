// controllers/taskController.js
// Create, read, update, and delete tasks for the LOGGED-ON user only.
//
// NEW THIS WEEK: tasks live in the PostgreSQL "tasks" table instead of
// global.tasks. Every query filters on BOTH the task id AND user_id, so one
// user can never see or change another user's tasks (authorization).
//
// Naming note: JavaScript uses camelCase (isCompleted) in requests and Joi;
// the database column is snake_case (is_completed). Responses come straight
// from the database, so they use is_completed.
// user_id is never returned: it's internal bookkeeping.

const pool = require("../db/pg-pool");
const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");

// The columns we send back to the client (no user_id).
const RETURN_COLUMNS = `id, title, is_completed`;

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

  // The database creates the id for us now (no more taskCounter).
  const result = await pool.query(
    `INSERT INTO tasks (title, is_completed, user_id)
     VALUES ($1, $2, $3) RETURNING ${RETURN_COLUMNS}`,
    [value.title, value.isCompleted, global.user_id],
  );

  res.status(201).json(result.rows[0]);
}

// GET /api/tasks
async function index(req, res) {
  const result = await pool.query(
    `SELECT ${RETURN_COLUMNS} FROM tasks WHERE user_id = $1 ORDER BY id`,
    [global.user_id],
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ message: "No tasks found for this user." });
  }

  res.status(200).json(result.rows);
}

// GET /api/tasks/:id
async function show(req, res) {
  const taskId = getTaskId(req);
  if (!taskId) {
    return res.status(400).json({ message: "The task ID passed is not valid." });
  }

  const result = await pool.query(
    `SELECT ${RETURN_COLUMNS} FROM tasks WHERE id = $1 AND user_id = $2`,
    [taskId, global.user_id],
  );

  if (result.rows.length === 0) {
    // 404 (not 403) so we don't reveal that another user's task exists.
    return res.status(404).json({ message: "That task was not found." });
  }

  res.status(200).json(result.rows[0]);
}

// PATCH /api/tasks/:id
async function update(req, res) {
  if (!req.body) req.body = {};

  // 1. Validate the patch body first, so bad data never reaches the database.
  const { error, value: taskChange } = patchTaskSchema.validate(req.body, {
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

  // 3. Build "title = $1, is_completed = $2" from only the fields that were sent.
  //    Map the JavaScript name (isCompleted) to the column name (is_completed).
  let keys = Object.keys(taskChange);
  keys = keys.map((key) => (key === "isCompleted" ? "is_completed" : key));
  const setClauses = keys.map((key, i) => `${key} = $${i + 1}`).join(", ");
  const idParm = `$${keys.length + 1}`;
  const userParm = `$${keys.length + 2}`;

  // 4. Update only if the task belongs to this user.
  const result = await pool.query(
    `UPDATE tasks SET ${setClauses}
     WHERE id = ${idParm} AND user_id = ${userParm} RETURNING ${RETURN_COLUMNS}`,
    [...Object.values(taskChange), taskId, global.user_id],
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ message: "That task was not found." });
  }

  res.status(200).json(result.rows[0]);
}

// DELETE /api/tasks/:id
async function deleteTask(req, res) {
  const taskId = getTaskId(req);
  if (!taskId) {
    return res.status(400).json({ message: "The task ID passed is not valid." });
  }

  // RETURNING gives us the deleted row, so we can send it back.
  const result = await pool.query(
    `DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING ${RETURN_COLUMNS}`,
    [taskId, global.user_id],
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ message: "That task was not found." });
  }

  res.status(200).json(result.rows[0]);
}

module.exports = { create, index, show, update, deleteTask };
