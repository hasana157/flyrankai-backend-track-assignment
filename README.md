# Task API (SQLite Version)

A CRUD API for managing a to-do list, built with FastAPI during the FlyRank Internship Backend Track.

**Week 3 Update:** Moved from in-memory storage to SQLite database. Data now persists across server restarts.

## Quick Start

### Prerequisites
- Python 3.10+
- pip
- DB Browser for SQLite (optional, for viewing the database)

### Installation & Running

```bash
pip install fastapi uvicorn --break-system-packages
uvicorn main:app --reload --port 8000
```

Then open http://localhost:8000/docs to see Swagger UI.

**Note:** The first time you run this, `tasks.db` is created automatically with 3 example tasks.

## Database

### Why SQLite?

- **Single file:** The entire database is just `tasks.db` on your computer
- **Zero setup:** No server to install or run
- **Persistence:** Data survives server restarts
- **Local development:** Perfect for prototyping and learning

### Database File

- **Location:** `tasks.db` (created automatically on first run)
- **Git:** Listed in `.gitignore` so each clone starts fresh
- **Schema:** One table `tasks` with columns: `id` (integer, primary key), `title` (text), `done` (boolean), `created_at` (timestamp), `updated_at` (timestamp)

### Viewing the Database

Install [DB Browser for SQLite](https://sqlitebrowser.org/dl/) (free).

Open `tasks.db` in DB Browser to:
- Browse data visually
- Run SQL queries by hand
- Test database directly (changes reflect in the API instantly)

## Endpoints

| Method | Path                    | Purpose                      |
| ------ | ----------------------- | ---------------------------- |
| GET    | `/`                     | API information              |
| GET    | `/health`               | Health check                 |
| GET    | `/tasks`                | List all tasks               |
| GET    | `/tasks/{id}`           | Get one task                 |
| POST   | `/tasks`                | Create a task                |
| PUT    | `/tasks/{id}`           | Update a task                |
| DELETE | `/tasks/{id}`           | Delete a task                |
| GET    | `/tasks/filter/done`    | Filter by done status        |
| GET    | `/tasks/search/{query}` | Search by title (SQL LIKE)   |
| GET    | `/stats`                | Task statistics              |
| POST   | `/reset`                | Reset to 3 example tasks     |

## Example Usage

### Create a task

```bash
curl -i -X POST http://localhost:8000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Buy milk"}'
```

**Response:**
```
HTTP/1.1 201 Created

{"id":4,"title":"Buy milk","done":false,"created_at":"2026-07-25 13:45:22","updated_at":"2026-07-25 13:45:22"}
```

### Get all tasks

```bash
curl -i http://localhost:8000/tasks
```

### Update a task

```bash
curl -i -X PUT http://localhost:8000/tasks/4 \
  -H "Content-Type: application/json" \
  -d '{"title":"Buy organic milk","done":true}'
```

### Delete a task

```bash
curl -i -X DELETE http://localhost:8000/tasks/4
```

**Response:**
```
HTTP/1.1 204 No Content
```

## Swagger UI

Interactive API documentation is available at `/docs` when the server is running.

![Swagger UI Screenshot](./swagger-screenshot.png)

## SQL Example (Stage 4)

Opened `tasks.db` in DB Browser and ran these queries by hand:

```sql
-- List all tasks
SELECT * FROM tasks;

-- Only completed tasks
SELECT * FROM tasks WHERE done = 1;

-- Count tasks
SELECT COUNT(*) FROM tasks;

-- Update all tasks to done
UPDATE tasks SET done = 1;
```

After running `UPDATE tasks SET done = 1` in DB Browser, immediately calling `GET /tasks` from the API returned all tasks with `"done": true` — **no restart needed**. The API and DB Browser read the same file.

## Data Persistence

### Test it yourself

1. Create a task via curl or Swagger UI
2. Stop the server (Ctrl+C)
3. Start the server again
4. Run GET /tasks
5. **Your new task is still there** ✅

The data now lives in `tasks.db` (a file on disk), not in memory. Restarting the program doesn't erase it.

## Architecture

### Assignment 1 (In-Memory)
```
Client → API → Python list in memory
                ↓ (data lost on restart)
```

### Assignment 2 (SQLite)
```
Client → API → SQLite database (tasks.db on disk)
                ↓ (data persists across restarts)
```

The API endpoints are identical. Only the storage layer changed.

## Timestamps (Stretch Goal)

Added `created_at` and `updated_at` columns to the tasks table.
When you add a column to an existing database, you're doing a "migration" —
a controlled schema change. The database preserved existing rows and just
added the new columns with default values. That's why migrations are
documented separately in real projects — they affect not just the code but
the actual data on disk.

## Notes

- Input validation: title cannot be empty (returns 400)
- Missing task ID returns 404
- All responses are JSON
- All SQL queries use parameterized `?` placeholders (safe against SQL injection)
- `updated_at` is automatically refreshed on every PUT request

## Stage 6: AI vs Me (Bonus)

### My Prompt to AI

> "I have a FastAPI to-do API with in-memory task storage. I need to migrate it to SQLite. Create a tasks.db database with a tasks table (id as primary key, title, done boolean). Seed 3 example tasks on first run only — prevent duplicates on restart. Keep the same 5 endpoints: GET /tasks, GET /tasks/{id}, POST /tasks, PUT /tasks/{id}, DELETE /tasks/{id}. Use parameterized queries with ? placeholders. Validate that title is not empty (return 400 if missing). Return 404 for unknown task ids. Everything else stays the same."

### Differences Found

1. **What the AI did better:**
   - Used `conn.row_factory = sqlite3.Row` consistently for cleaner dictionary conversion without a manual helper function.
   - Understand it? Yes — it makes each row behave like a dict automatically so you can do `row["title"]` instead of `row[1]`.

2. **What the AI got wrong:**
   - Forgot to add `created_at` / `updated_at` timestamp columns (I didn't specify them, so it didn't add them).
   - Didn't include stretch goal endpoints (`/stats`, `/search`, `/filter/done`, `/reset`).

3. **What my prompt forgot (AI decided silently):**
   - I didn't specify whether to strip whitespace from titles — AI didn't add `.strip()`.
   - I didn't mention stretch goals at all; AI only built the 5 basic endpoints.

### My Improved Prompt (2nd Try)

> "Migrate a FastAPI to-do API from in-memory to SQLite (tasks.db). Tasks table: id (PK autoincrement), title (text), done (boolean), created_at, updated_at (timestamps). Seed 3 tasks once on startup only. Full CRUD: GET /tasks, GET /tasks/{id}, POST /tasks (201, strip+validate title, 400 if empty), PUT /tasks/{id} (update title/done, refresh updated_at), DELETE /tasks/{id} (204). Also add: /stats (total/done/open counts), /tasks/search/{query} (LIKE), /tasks/filter/done (query param), /reset (delete all + re-seed). Parameterized queries only. 404 for unknown IDs."

### What Changed in AI's 2nd Version

The 2nd version included timestamps, all stretch endpoints, whitespace stripping, and a complete reset endpoint matching our implementation exactly.
