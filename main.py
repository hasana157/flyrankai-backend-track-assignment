from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(
    title="FlyRank Task API",
    description="A CRUD API for managing tasks built with FastAPI during FlyRank internship. Supports create, read, update, delete operations with in-memory storage and Swagger UI.",
    version="1.0"
)

# In-memory task list
tasks = [
    {"id": 1, "title": "Buy milk", "done": False},
    {"id": 2, "title": "Walk the dog", "done": False},
    {"id": 3, "title": "Finish assignment", "done": True}
]

class TaskCreate(BaseModel):
    title: str

class TaskUpdate(BaseModel):
    title: str = None
    done: bool = None

@app.get("/")
def root():
    """Get API information"""
    return {
        "name": "Task API",
        "version": "1.0",
        "endpoints": ["/tasks", "/tasks/{id}", "/tasks/filter/done", "/tasks/search/{query}", "/stats", "/reset"]
    }

@app.get("/health")
def health():
    """Health check endpoint"""
    return {"status": "ok"}

@app.get("/tasks")
def get_all_tasks():
    """Retrieve all tasks"""
    return tasks

@app.get("/tasks/filter/done")
def filter_done(done: bool = None):
    """Filter tasks by done status. Usage: GET /tasks/filter/done?done=true"""
    if done is None:
        return tasks
    return [t for t in tasks if t["done"] == done]

@app.get("/tasks/search/{query}")
def search_tasks(query: str):
    """Search tasks by title"""
    return [t for t in tasks if query.lower() in t["title"].lower()]

@app.get("/stats")
def get_stats():
    """Get task statistics"""
    return {
        "total": len(tasks),
        "done": len([t for t in tasks if t["done"]]),
        "open": len([t for t in tasks if not t["done"]])
    }

@app.get("/tasks/{id}")
def get_task(id: int):
    """Retrieve a single task by ID"""
    for task in tasks:
        if task["id"] == id:
            return task
    raise HTTPException(status_code=404, detail=f"Task {id} not found")

@app.post("/tasks", status_code=201)
def create_task(task: TaskCreate):
    """Create a new task"""
    if not task.title or task.title.strip() == "":
        raise HTTPException(status_code=400, detail="Title cannot be empty")
    
    next_id = max([t["id"] for t in tasks]) + 1 if tasks else 1
    new_task = {"id": next_id, "title": task.title, "done": False}
    tasks.append(new_task)
    
    return new_task

@app.put("/tasks/{id}")
def update_task(id: int, task: TaskUpdate):
    """Update a task's title and/or done status"""
    for i, t in enumerate(tasks):
        if t["id"] == id:
            if task.title is not None:
                if task.title.strip() == "":
                    raise HTTPException(status_code=400, detail="Title cannot be empty")
                tasks[i]["title"] = task.title
            if task.done is not None:
                tasks[i]["done"] = task.done
            return tasks[i]
    
    raise HTTPException(status_code=404, detail=f"Task {id} not found")

@app.delete("/tasks/{id}", status_code=204)
def delete_task(id: int):
    """Delete a task"""
    for i, task in enumerate(tasks):
        if task["id"] == id:
            tasks.pop(i)
            return
    
    raise HTTPException(status_code=404, detail=f"Task {id} not found")

@app.post("/reset", status_code=200)
def reset_tasks():
    """Reset tasks to initial state (for demos/testing)"""
    global tasks
    tasks = [
        {"id": 1, "title": "Buy milk", "done": False},
        {"id": 2, "title": "Walk the dog", "done": False},
        {"id": 3, "title": "Finish assignment", "done": True}
    ]
    return {"message": "Tasks reset to initial state", "tasks": tasks}
