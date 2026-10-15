const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const app = require("../server");

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

async function request(route, options) {
  const response = await fetch(`${baseUrl}${route}`, options);
  const text = await response.text();
  return { status: response.status, text };
}

test("serves the required root, health, and initial task endpoints", async () => {
  const root = await request("/");
  assert.equal(root.status, 200);
  assert.deepEqual(JSON.parse(root.text), {
    name: "Task API",
    version: "1.0",
    endpoints: ["/tasks"],
  });

  const health = await request("/health");
  assert.equal(health.status, 200);
  assert.deepEqual(JSON.parse(health.text), { status: "ok" });

  const tasks = await request("/tasks");
  assert.equal(tasks.status, 200);
  assert.equal(JSON.parse(tasks.text).length, 3);
});

test("supports CRUD with required validation and status codes", async () => {
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
    body: JSON.stringify({ title: "Test task" }),
  });
  assert.equal(created.status, 201);
  const task = JSON.parse(created.text);
  assert.deepEqual(task, { id: 4, title: "Test task", done: false });

  const updated = await request(`/tasks/${task.id}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "Updated task", done: true }),
  });
  assert.equal(updated.status, 200);
  assert.deepEqual(JSON.parse(updated.text), {
    id: task.id,
    title: "Updated task",
    done: true,
  });

  const deleted = await request(`/tasks/${task.id}`, { method: "DELETE" });
  assert.equal(deleted.status, 204);
  assert.equal(deleted.text, "");
});

test("serves the API documentation and in-memory extras", async () => {
  const docs = await request("/docs");
  assert.equal(docs.status, 200);

  const filter = await request("/tasks?done=true");
  assert.equal(filter.status, 200);
  assert.ok(JSON.parse(filter.text).every((task) => task.done));

  const search = await request("/tasks?search=milk");
  assert.equal(search.status, 200);
  assert.ok(JSON.parse(search.text).every((task) => /milk/i.test(task.title)));
});
