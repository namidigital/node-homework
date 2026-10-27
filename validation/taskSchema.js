// validation/taskSchema.js
// Two different checklists:
//   taskSchema      -> for CREATING a task (title required)
//   patchTaskSchema -> for UPDATING a task (any field, but at least one)

const Joi = require("joi");

const taskSchema = Joi.object({
  title: Joi.string().trim().min(3).max(30).required(),
  isCompleted: Joi.boolean().default(false).not(null), // defaults to false
});

const patchTaskSchema = Joi.object({
  title: Joi.string().trim().min(3).max(30).not(null),
  isCompleted: Joi.boolean().not(null), // NO default here: only change what was sent
})
  .min(1)
  .message("No attributes to change were specified.");

module.exports = { taskSchema, patchTaskSchema };
