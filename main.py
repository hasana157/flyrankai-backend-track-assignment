from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

# In-memory task list
tasks = [
    {"id": 1, "title": "Buy milk", "done": False},
    {"id": 2, "title": "Walk the dog", "done": False},
    {"id": 3, "title": "Finish assignment", "done": True}
]

class TaskCreate(BaseModel):
    title: str

@app.get("/")
def root():
    return {
        "name": "Task API",
        "version": "1.0",
        "endpoints": ["/tasks"]
    }

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/tasks")
def get_all_tasks():
    """List all tasks"""
    return tasks

@app.get("/tasks/{id}")
def get_task(id: int):
    """Get a single task by ID"""
    for task in tasks:
        if task["id"] == id:
            return task
    raise HTTPException(status_code=404, detail=f"Task {id} not found")

@app.post("/tasks", status_code=201)
def create_task(task: TaskCreate):
    """Create a new task"""
    # Validate: title must not be empty
    if not task.title or task.title.strip() == "":
        raise HTTPException(status_code=400, detail="Title cannot be empty")
    
    # Find next ID
    next_id = max([t["id"] for t in tasks]) + 1 if tasks else 1
    
    # Create new task
    new_task = {"id": next_id, "title": task.title, "done": False}
    tasks.append(new_task)
    
    return new_task
