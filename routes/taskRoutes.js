// routes/taskRoutes.js
// Mounted at /api/tasks in app.js (behind the auth middleware),
// so "/" here means "/api/tasks" and "/:id" means "/api/tasks/7", etc.

const express = require("express");
const {
  create,
  index,
  show,
  update,
  deleteTask,
  bulkCreate,
} = require("../controllers/taskController");

const router = express.Router();

router.get("/", index);
router.post("/bulk", bulkCreate); // MUST come before "/:id", or Express reads "bulk" as an id
router.get("/:id", show);
router.post("/", create);
router.patch("/:id", update);
router.delete("/:id", deleteTask);

module.exports = router;
