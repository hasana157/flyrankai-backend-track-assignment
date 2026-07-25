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

class TaskUpdate(BaseModel):
    title: str = None
    done: bool = None

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

@app.put("/tasks/{id}")
def update_task(id: int, task: TaskUpdate):
    """Update a task's title and/or done status"""
    for i, t in enumerate(tasks):
        if t["id"] == id:
            # Update only provided fields
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
            return  # 204 returns no content
    
    raise HTTPException(status_code=404, detail=f"Task {id} not found")
