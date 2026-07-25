# Task API

A simple CRUD API for managing a to-do list, built with FastAPI during the FlyRank Internship Backend Track.

## Quick Start

### Prerequisites
- Python 3.10+
- pip

### Installation & Running

```bash
pip install fastapi uvicorn --break-system-packages
uvicorn main:app --reload --port 8000
```

Then open http://localhost:8000/docs to see Swagger UI.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | API information |
| GET | `/health` | Health check |
| GET | `/tasks` | List all tasks |
| GET | `/tasks/{id}` | Get one task |
| POST | `/tasks` | Create a task |
| PUT | `/tasks/{id}` | Update a task |
| DELETE | `/tasks/{id}` | Delete a task |
| GET | `/tasks/filter/done` | Filter tasks by done status |
| GET | `/tasks/search/{query}` | Search tasks by title |
| GET | `/stats` | Task statistics |
| POST | `/reset` | Reset tasks to initial state |

## Example Usage

### Create a task
```bash
curl -i -X POST http://localhost:8000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Buy milk"}'
```

**Response:**

```http
HTTP/1.1 201 Created

{"id":4,"title":"Buy milk","done":false}
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

```http
HTTP/1.1 204 No Content
```

## Swagger UI

Interactive API documentation is available at `/docs` when the server is running.

![Swagger UI Screenshot](./swagger-screenshot.png)

## Notes

- Tasks are stored **in memory only** — data is lost when the server restarts
- Input validation: title cannot be empty
- Proper HTTP status codes: 200 (OK), 201 (Created), 204 (No Content), 400 (Bad Request), 404 (Not Found)

### Mortality Experiment

Created a task while the server was running. Stopped the server, restarted it, and checked `GET /tasks`.

**Result:** The newly created task disappeared. Only the hardcoded initial 3 tasks remained.

**Why:** All data is stored in Python variables in memory. When the process stops, RAM is cleared. The code is re-executed from scratch, reloading only the hardcoded tasks. This is why databases exist — they persist data to disk.

## Stage 7: AI vs Me (Bonus)

### My Prompt to AI

> "I need a FastAPI server on port 8000 that manages tasks. Each task has id (number), title (string), and done (boolean). Implement 5 endpoints: GET /tasks (list all), GET /tasks/{id} (get one, return 404 if missing), POST /tasks (create with title in body, return 201, validate title not empty returns 400), PUT /tasks/{id} (update title and/or done, return 404 if missing), DELETE /tasks/{id} (remove task, return 204 if success, 404 if not found). Store tasks in a Python list in memory. All responses return JSON."

### Differences Found

1. **What the AI did better:**
   - It used `pydantic.Field(..., min_length=1)` and `status.HTTP_201_CREATED` constant names for standard HTTP status code definitions, which makes the schema and status codes cleaner and self-documenting.
   - Yes, I understand it: using `Field` adds declarative validation directly at the Pydantic schema layer before reaching the endpoint handler.

2. **What the AI got wrong / missed:**
   - The AI didn't include custom metadata endpoints (such as `/` and `/health`) or extra stretch goal endpoints (`/stats`, `/tasks/search/{query}`, `/tasks/filter/done`, `/reset`).

3. **What my prompt forgot (AI decided silently):**
   - I didn't specify whether to strip leading/trailing whitespace from task titles; the AI automatically added `.strip()`.
   - I didn't specify docstrings; the AI omitted detailed docstrings for the Swagger UI.

### My Improved Prompt (2nd Try)

> "Build a FastAPI To-Do list API with in-memory storage, OpenAPI title/description, docstrings for all endpoints, root/health endpoints, full CRUD with Pydantic validation (min_length=1, whitespace stripping), search, done filtering, stats, reset endpoints, and proper 200/201/204/400/404 HTTP status codes."

### What Changed in AI's 2nd Version

The 2nd version included full OpenAPI docstrings, root metadata, and complete stretch endpoints.
