// middleware/auth.js
// The gatekeeper for task routes (authentication: "who is logged in?").
// Analogy: the badge reader at the control room door. No badge, no entry.
// For now, global.user_id holds the logged-on user (a temporary scaffold).

module.exports = (req, res, next) => {
  if (!global.user_id) {
    // return = stop here. Don't also call next() after sending a response.
    return res.status(401).json({ message: "Unauthorized" });
  }
  next(); // badge checks out, go on to the task controller
};
