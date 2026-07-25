from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional

app = FastAPI(title="AI Generated Task API")

# In-memory storage for tasks
tasks = [
    {"id": 1, "title": "Buy milk", "done": False},
    {"id": 2, "title": "Walk the dog", "done": False},
    {"id": 3, "title": "Finish assignment", "done": True}
]

class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, description="Task title cannot be empty")

class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1)
    done: Optional[bool] = None

@app.get("/tasks")
def get_all_tasks():
    return tasks

@app.get("/tasks/{id}")
def get_task(id: int):
    for task in tasks:
        if task["id"] == id:
            return task
    raise HTTPException(status_code=404, detail=f"Task {id} not found")

@app.post("/tasks", status_code=status.HTTP_201_CREATED)
def create_task(task: TaskCreate):
    if not task.title.strip():
        raise HTTPException(status_code=400, detail="Title cannot be empty")
    next_id = max([t["id"] for t in tasks], default=0) + 1
    new_task = {"id": next_id, "title": task.title.strip(), "done": False}
    tasks.append(new_task)
    return new_task

@app.put("/tasks/{id}")
def update_task(id: int, task: TaskUpdate):
    for t in tasks:
        if t["id"] == id:
            if task.title is not None:
                if not task.title.strip():
                    raise HTTPException(status_code=400, detail="Title cannot be empty")
                t["title"] = task.title.strip()
            if task.done is not None:
                t["done"] = task.done
            return t
    raise HTTPException(status_code=404, detail=f"Task {id} not found")

@app.delete("/tasks/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(id: int):
    for i, t in enumerate(tasks):
        if t["id"] == id:
            tasks.pop(i)
            return
    raise HTTPException(status_code=404, detail=f"Task {id} not found")
