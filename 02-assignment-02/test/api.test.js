const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const Database = require("better-sqlite3");

let temporaryDirectory;
let databasePath;
let api;
let server;
let baseUrl;

async function startApi() {
  api = require("../app");
  server = api.app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
}

async function stopApi() {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    server = undefined;
  }
  if (api) {
    api.db.close();
    delete require.cache[require.resolve("../app")];
    api = undefined;
  }
}

async function request(route, options) {
  const response = await fetch(`${baseUrl}${route}`, options);
  const text = await response.text();
  return { status: response.status, text };
}

before(async () => {
  temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "flyrank-a2-"));
  databasePath = path.join(temporaryDirectory, "tasks.db");
  process.env.TASKS_DB_PATH = databasePath;
  await startApi();
});

after(async () => {
  await stopApi();
  delete process.env.TASKS_DB_PATH;
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

test("creates the database and seeds exactly three tasks once", async () => {
  assert.equal(fs.existsSync(databasePath), true);
  assert.deepEqual(
    api.db.pragma("table_info(tasks)").map((column) => column.name),
    ["id", "title", "done"],
  );
  const firstRun = await request("/tasks");
  assert.equal(firstRun.status, 200);
  assert.equal(JSON.parse(firstRun.text).length, 3);

  await stopApi();
  await startApi();
  const secondRun = await request("/tasks");
  assert.equal(secondRun.status, 200);
  assert.equal(JSON.parse(secondRun.text).length, 3);
});

test("supports the same CRUD statuses, validation, and response shapes as A1", async () => {
  const root = await request("/");
  assert.equal(root.status, 200);
  assert.deepEqual(JSON.parse(root.text), {
    name: "Task API",
    version: "1.0",
    endpoints: ["/tasks"],
  });

  const missing = await request("/tasks/999");
  assert.equal(missing.status, 404);
  assert.deepEqual(JSON.parse(missing.text), { error: "Task 999 not found" });

  const invalid = await request("/tasks", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  assert.equal(invalid.status, 400);

  const created = await request("/tasks", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "Buy organic milk" }),
  });
  assert.equal(created.status, 201);
  const task = JSON.parse(created.text);
  assert.deepEqual(Object.keys(task).sort(), ["done", "id", "title"]);
  assert.equal(task.title, "Buy organic milk");

  const updated = await request(`/tasks/${task.id}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ done: true }),
  });
  assert.equal(updated.status, 200);
  assert.deepEqual(JSON.parse(updated.text), {
    id: task.id,
    title: "Buy organic milk",
    done: true,
  });

  const deleted = await request(`/tasks/${task.id}`, { method: "DELETE" });
  assert.equal(deleted.status, 204);
  assert.equal(deleted.text, "");
});

test("keeps writes across an application restart and reads DB changes live", async () => {
  const created = await request("/tasks", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "Persistent task" }),
  });
  assert.equal(created.status, 201);
  const task = JSON.parse(created.text);

  await stopApi();
  await startApi();
  const persisted = await request(`/tasks/${task.id}`);
  assert.equal(persisted.status, 200);
  assert.equal(JSON.parse(persisted.text).title, "Persistent task");

  const directConnection = new Database(databasePath);
  directConnection.prepare("UPDATE tasks SET done = 1 WHERE id = ?").run(task.id);
  directConnection.close();
  const changedInDatabase = await request(`/tasks/${task.id}`);
  assert.equal(JSON.parse(changedInDatabase.text).done, true);
});

test("runs filtering, statistics, and reset against the database", async () => {
  const filtered = await request("/tasks?done=true&search=assignment");
  assert.equal(filtered.status, 200);
  assert.deepEqual(
    JSON.parse(filtered.text).map(({ title, done }) => ({ title, done })),
    [{ title: "Finish assignment", done: true }],
  );

  const stats = await request("/stats");
  assert.equal(stats.status, 200);
  assert.deepEqual(JSON.parse(stats.text), { total: 4, done: 2, open: 2 });

  const reset = await request("/reset", { method: "POST" });
  assert.equal(reset.status, 200);
  assert.equal(JSON.parse(reset.text).tasks.length, 3);
  assert.deepEqual(JSON.parse((await request("/tasks")).text).map((task) => task.id), [1, 2, 3]);
});
