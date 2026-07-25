import sqlite3
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional

app = FastAPI(title="AI Generated Task API (SQLite)")

DB_PATH = "tasks_ai.db"

class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, description="Task title cannot be empty")

class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1)
    done: Optional[bool] = None

def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            done BOOLEAN DEFAULT 0
        )
    """)
    cursor.execute("SELECT COUNT(*) FROM tasks")
    if cursor.fetchone()[0] == 0:
        cursor.execute("""
            INSERT INTO tasks (title, done) VALUES
            ('Buy milk', 0),
            ('Walk the dog', 0),
            ('Finish assignment', 1)
        """)
        conn.commit()
    conn.close()

init_db()

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

@app.get("/tasks")
def get_all_tasks():
    conn = get_conn()
    rows = conn.execute("SELECT * FROM tasks").fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.get("/tasks/{id}")
def get_task(id: int):
    conn = get_conn()
    row = conn.execute("SELECT * FROM tasks WHERE id = ?", (id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail=f"Task {id} not found")
    return dict(row)

@app.post("/tasks", status_code=status.HTTP_201_CREATED)
def create_task(task: TaskCreate):
    if not task.title.strip():
        raise HTTPException(status_code=400, detail="Title cannot be empty")
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO tasks (title, done) VALUES (?, ?)", (task.title.strip(), False))
    conn.commit()
    row = cursor.execute("SELECT * FROM tasks WHERE id = ?", (cursor.lastrowid,)).fetchone()
    conn.close()
    return dict(row)

@app.put("/tasks/{id}")
def update_task(id: int, task: TaskUpdate):
    conn = get_conn()
    if not conn.execute("SELECT id FROM tasks WHERE id = ?", (id,)).fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail=f"Task {id} not found")
    if task.title is not None and not task.title.strip():
        conn.close()
        raise HTTPException(status_code=400, detail="Title cannot be empty")
    if task.title is not None and task.done is not None:
        conn.execute("UPDATE tasks SET title = ?, done = ? WHERE id = ?", (task.title.strip(), task.done, id))
    elif task.title is not None:
        conn.execute("UPDATE tasks SET title = ? WHERE id = ?", (task.title.strip(), id))
    elif task.done is not None:
        conn.execute("UPDATE tasks SET done = ? WHERE id = ?", (task.done, id))
    conn.commit()
    row = conn.execute("SELECT * FROM tasks WHERE id = ?", (id,)).fetchone()
    conn.close()
    return dict(row)

@app.delete("/tasks/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(id: int):
    conn = get_conn()
    if not conn.execute("SELECT id FROM tasks WHERE id = ?", (id,)).fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail=f"Task {id} not found")
    conn.execute("DELETE FROM tasks WHERE id = ?", (id,))
    conn.commit()
    conn.close()
