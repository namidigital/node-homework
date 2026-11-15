// controllers/analyticsController.js
// Reporting endpoints: groupBy counts, _count aggregations, and a raw SQL search.
// Analogy: the plant's monthly report. Instead of reading every logbook entry,
// we ask the database to tally things up ("how many done, how many open?").
//
// Security note: any logged-on user can call these for ANY user right now.
// In production, cross-user analytics would be limited to an admin role.

const prisma = require("../db/prisma");

// Shared helper: read ?page=&limit= and check them.
// Returns { error } or { page, limit, skip }.
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

// Shared helper: the pagination "receipt" that goes back with each page.
function buildPagination(page, limit, total) {
  return {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  };
}

// GET /api/analytics/users/:id
async function getUserAnalytics(req, res, next) {
  const userId = parseInt(req.params.id);
  if (isNaN(userId)) {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  try {
    // 404 check: does this user exist at all?
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // groupBy: one row per isCompleted value, with a count of tasks in each.
    // SQL equivalent: SELECT is_completed, COUNT(id) ... GROUP BY is_completed
    const taskStats = await prisma.task.groupBy({
      by: ["isCompleted"],
      where: { userId },
      _count: {
        id: true,
      },
    });

    // Eager loading: the last 10 tasks AND their owner's name, in one call.
    const recentTasks = await prisma.task.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        isCompleted: true,
        priority: true,
        createdAt: true,
        userId: true,
        User: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Weekly progress: tasks created in the last 7 days.
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const weeklyProgress = await prisma.task.groupBy({
      by: ["createdAt"],
      where: {
        userId,
        createdAt: { gte: oneWeekAgo },
      },
      _count: { id: true },
    });

    res.status(200).json({ taskStats, recentTasks, weeklyProgress });
  } catch (err) {
    return next(err);
  }
}

// GET /api/analytics/users
async function getUsersWithStats(req, res, next) {
  const paging = getPaging(req.query);
  if (paging.error) {
    return res.status(400).json({ error: paging.error });
  }
  const { page, limit, skip } = paging;

  try {
    // _count asks the database to count each user's tasks for us.
    // Task (with where + take) lists up to 5 incomplete task ids.
    const usersRaw = await prisma.user.findMany({
      include: {
        Task: {
          where: { isCompleted: false },
          select: { id: true },
          take: 5,
        },
        _count: {
          select: {
            Task: true,
          },
        },
      },
      skip: skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    // include returns EVERY user column (even hashedPassword!), so we copy
    // over only the safe fields. Never send a password hash to a client.
    const users = usersRaw.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      _count: user._count,
      Task: user.Task,
    }));

    const totalUsers = await prisma.user.count();
    const pagination = buildPagination(page, limit, totalUsers);

    res.status(200).json({ users, pagination });
  } catch (err) {
    return next(err);
  }
}

// GET /api/analytics/tasks/search?q=...&limit=...
async function searchTasks(req, res, next) {
  const searchQuery = req.query.q;
  if (!searchQuery || searchQuery.trim().length < 2) {
    return res.status(400).json({
      error: "Search query must be at least 2 characters long",
    });
  }

  let limit = parseInt(req.query.limit) || 20;
  if (limit < 1 || limit > 100) limit = 20;

  // Build the patterns OUTSIDE the SQL. Each ${...} below becomes a $1-style
  // parameter, so user input is never pasted into the SQL text itself.
  const searchPattern = `%${searchQuery}%`;
  const exactMatch = searchQuery;
  const startsWith = `${searchQuery}%`;

  try {
    // Raw SQL because we want relevance ranking (exact > starts-with > contains),
    // which Prisma's query builder can't express.
    const searchResults = await prisma.$queryRaw`
      SELECT
        t.id,
        t.title,
        t.is_completed as "isCompleted",
        t.priority,
        t.created_at as "createdAt",
        t.user_id as "userId",
        u.name as "user_name"
      FROM tasks t
      JOIN users u ON t.user_id = u.id
      WHERE t.title ILIKE ${searchPattern}
         OR u.name ILIKE ${searchPattern}
      ORDER BY
        CASE
          WHEN t.title ILIKE ${exactMatch} THEN 1
          WHEN t.title ILIKE ${startsWith} THEN 2
          WHEN t.title ILIKE ${searchPattern} THEN 3
          ELSE 4
        END,
        t.created_at DESC
      LIMIT ${limit}
    `;

    res.status(200).json({
      results: searchResults,
      query: searchQuery,
      count: searchResults.length,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getUserAnalytics, getUsersWithStats, searchTasks };
