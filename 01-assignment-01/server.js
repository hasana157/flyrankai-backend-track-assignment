const express = require("express");
const swaggerUi = require("swagger-ui-express");
const openApiDocument = require("./openapi.json");

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json());

let tasks = [
  { id: 1, title: "Buy milk", done: false },
  { id: 2, title: "Walk the dog", done: false },
  { id: 3, title: "Finish assignment", done: true },
];
let nextTaskId = 4;

function findTask(taskId) {
  return tasks.find((task) => task.id === taskId);
}

function validateTitle(title) {
  return typeof title === "string" && title.trim().length > 0;
}

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
  let result = tasks;
  if (request.query.done !== undefined) {
    if (request.query.done !== "true" && request.query.done !== "false") {
      return response.status(400).json({ error: "done must be true or false" });
    }
    const done = request.query.done === "true";
    result = result.filter((task) => task.done === done);
  }
  if (request.query.search !== undefined) {
    const query = request.query.search.toLocaleLowerCase();
    result = result.filter((task) =>
      task.title.toLocaleLowerCase().includes(query),
    );
  }
  return response.json(result);
});

app.post("/tasks", (request, response) => {
  if (!validateTitle(request.body?.title)) {
    return response.status(400).json({ error: "title must be a non-empty string" });
  }

  const task = {
    id: nextTaskId,
    title: request.body.title.trim(),
    done: false,
  };
  nextTaskId += 1;
  tasks.push(task);
  return response.status(201).json(task);
});

app.get("/tasks/:id", (request, response) => {
  const taskId = Number(request.params.id);
  const task = Number.isInteger(taskId) && taskId > 0 ? findTask(taskId) : null;
  if (!task) {
    return response
      .status(404)
      .json({ error: `Task ${request.params.id} not found` });
  }
  return response.json(task);
});

app.put("/tasks/:id", (request, response) => {
  const taskId = Number(request.params.id);
  const task = Number.isInteger(taskId) && taskId > 0 ? findTask(taskId) : null;
  if (!task) {
    return response
      .status(404)
      .json({ error: `Task ${request.params.id} not found` });
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
  if ("title" in updates && !validateTitle(updates.title)) {
    return response.status(400).json({ error: "title must be a non-empty string" });
  }
  if ("done" in updates && typeof updates.done !== "boolean") {
    return response.status(400).json({ error: "done must be a boolean" });
  }

  if ("title" in updates) task.title = updates.title.trim();
  if ("done" in updates) task.done = updates.done;
  return response.json(task);
});

app.delete("/tasks/:id", (request, response) => {
  const taskId = Number(request.params.id);
  const taskIndex =
    Number.isInteger(taskId) && taskId > 0
      ? tasks.findIndex((task) => task.id === taskId)
      : -1;
  if (taskIndex === -1) {
    return response
      .status(404)
      .json({ error: `Task ${request.params.id} not found` });
  }
  tasks.splice(taskIndex, 1);
  return response.status(204).end();
});

app.get("/stats", (_request, response) => {
  const done = tasks.filter((task) => task.done).length;
  response.json({ total: tasks.length, done, open: tasks.length - done });
});

app.post("/reset", (_request, response) => {
  tasks = [
    { id: 1, title: "Buy milk", done: false },
    { id: 2, title: "Walk the dog", done: false },
    { id: 3, title: "Finish assignment", done: true },
  ];
  nextTaskId = 4;
  response.json({ message: "Tasks reset to initial state", tasks });
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

app.use((error, _request, response, _next) => {
  if (error instanceof SyntaxError && "body" in error) {
    return response.status(400).json({ error: "Request body must contain valid JSON" });
  }
  console.error(error);
  return response.status(500).json({ error: "Internal server error" });
});

app.listen(port, () => {
  console.log(`Task API listening at http://localhost:${port}`);
});
