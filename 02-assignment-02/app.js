const path = require("node:path");
const express = require("express");
const Database = require("better-sqlite3");
const swaggerUi = require("swagger-ui-express");
const openApiDocument = require("./openapi.json");

const databasePath = process.env.TASKS_DB_PATH || path.join(__dirname, "tasks.db");
const db = new Database(databasePath);

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    done INTEGER NOT NULL DEFAULT 0 CHECK (done IN (0, 1))
  )
`);

const countTasks = db.prepare("SELECT COUNT(*) AS count FROM tasks");
const insertTask = db.prepare("INSERT INTO tasks (title, done) VALUES (?, ?)");
const seedTasks = db.transaction(() => {
  if (countTasks.get().count !== 0) return;

  insertTask.run("Buy milk", 0);
  insertTask.run("Walk the dog", 0);
  insertTask.run("Finish assignment", 1);
});
seedTasks();

const statements = {
  allTasks: db.prepare("SELECT id, title, done FROM tasks ORDER BY id"),
  taskById: db.prepare("SELECT id, title, done FROM tasks WHERE id = ?"),
  tasksByDone: db.prepare(
    "SELECT id, title, done FROM tasks WHERE done = ? ORDER BY id",
  ),
  tasksByTitle: db.prepare(
    "SELECT id, title, done FROM tasks WHERE title LIKE ? ORDER BY id",
  ),
  tasksByTitleAndDone: db.prepare(
    "SELECT id, title, done FROM tasks WHERE title LIKE ? AND done = ? ORDER BY id",
  ),
  insertTask,
  updateTask: db.prepare(
    "UPDATE tasks SET title = ?, done = ? WHERE id = ?",
  ),
  deleteTask: db.prepare("DELETE FROM tasks WHERE id = ?"),
  stats: db.prepare(
    "SELECT COUNT(*) AS total, COALESCE(SUM(done), 0) AS done FROM tasks",
  ),
  resetTasks: db.transaction(() => {
    db.prepare("DELETE FROM tasks").run();
    db.prepare("DELETE FROM sqlite_sequence WHERE name = ?").run("tasks");
    insertTask.run("Buy milk", 0);
    insertTask.run("Walk the dog", 0);
    insertTask.run("Finish assignment", 1);
  }),
};

function toTask(row) {
  return { id: row.id, title: row.title, done: Boolean(row.done) };
}

function findTask(taskId) {
  if (!Number.isInteger(taskId) || taskId <= 0) return undefined;
  return statements.taskById.get(taskId);
}

function isValidTitle(title) {
  return typeof title === "string" && title.trim().length > 0;
}

const app = express();
app.use(express.json());

app.get("/", (_request, response) => {
  response.json({
    name: "Task API",
    version: "1.0",
    endpoints: ["/tasks"],
  });
});

app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.get("/tasks", (request, response) => {
  const { done, search } = request.query;
  if (done !== undefined && done !== "true" && done !== "false") {
    return response.status(400).json({ error: "done must be true or false" });
  }

  let rows;
  if (search !== undefined && done !== undefined) {
    rows = statements.tasksByTitleAndDone.all(
      `%${search}%`,
      done === "true" ? 1 : 0,
    );
  } else if (search !== undefined) {
    rows = statements.tasksByTitle.all(`%${search}%`);
  } else if (done !== undefined) {
    rows = statements.tasksByDone.all(done === "true" ? 1 : 0);
  } else {
    rows = statements.allTasks.all();
  }

  return response.json(rows.map(toTask));
});

app.post("/tasks", (request, response) => {
  if (!isValidTitle(request.body?.title)) {
    return response.status(400).json({ error: "title must be a non-empty string" });
  }

  const result = statements.insertTask.run(request.body.title.trim(), 0);
  const task = findTask(Number(result.lastInsertRowid));
  return response.status(201).json(toTask(task));
});

app.get("/tasks/:id", (request, response) => {
  const task = findTask(Number(request.params.id));
  if (!task) {
    return response.status(404).json({ error: `Task ${request.params.id} not found` });
  }
  return response.json(toTask(task));
});

app.put("/tasks/:id", (request, response) => {
  const taskId = Number(request.params.id);
  const existing = findTask(taskId);
  if (!existing) {
    return response.status(404).json({ error: `Task ${request.params.id} not found` });
  }

  const updates = request.body;
  if (
    !updates ||
    typeof updates !== "object" ||
    Array.isArray(updates) ||
    Object.keys(updates).length === 0
  ) {
    return response.status(400).json({ error: "Provide a title or done value" });
  }
  if (Object.keys(updates).some((key) => key !== "title" && key !== "done")) {
    return response.status(400).json({ error: "Only title and done can be updated" });
  }
  if ("title" in updates && !isValidTitle(updates.title)) {
    return response.status(400).json({ error: "title must be a non-empty string" });
  }
  if ("done" in updates && typeof updates.done !== "boolean") {
    return response.status(400).json({ error: "done must be a boolean" });
  }

  const title = "title" in updates ? updates.title.trim() : existing.title;
  const done = "done" in updates ? Number(updates.done) : existing.done;
  statements.updateTask.run(title, done, taskId);
  return response.json(toTask(findTask(taskId)));
});

app.delete("/tasks/:id", (request, response) => {
  const taskId = Number(request.params.id);
  if (!findTask(taskId)) {
    return response.status(404).json({ error: `Task ${request.params.id} not found` });
  }
  statements.deleteTask.run(taskId);
  return response.status(204).end();
});

app.get("/stats", (_request, response) => {
  const { total, done } = statements.stats.get();
  response.json({ total, done, open: total - done });
});

app.post("/reset", (_request, response) => {
  statements.resetTasks();
  response.json({ message: "Tasks reset to initial state", tasks: statements.allTasks.all().map(toTask) });
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

app.use((error, _request, response, _next) => {
  if (error instanceof SyntaxError && "body" in error) {
    return response.status(400).json({ error: "Request body must contain valid JSON" });
  }
  console.error(error);
  return response.status(500).json({ error: "Internal server error" });
});

module.exports = { app, db };
