import asyncio
import json
from typing import List

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from starlette.responses import StreamingResponse
from ollama import AsyncClient

# Define the request model using Pydantic for data validation
class ChatRequest(BaseModel):
    prompt: str
    models: List[str]

# Initialize the FastAPI app
app = FastAPI()

# Configure CORS to allow requests from our frontend
# This is crucial for web browsers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# This async generator function handles calling a single Ollama model
async def stream_ollama_response(model: str, prompt: str, client: AsyncClient):
    """Streams a response from a single Ollama model using the Ollama Python library."""
    try:
        response = await client.chat(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            stream=True
        )
        
        async for chunk in response:
            # Yield the data in our standardized SSE format
            sse_data = {
                "model": model,
                "token": chunk.message.content or "",
                "done": chunk.done,
            }
            yield f"data: {json.dumps(sse_data)}\n\n"
            
    except Exception as e:
        error_message = f"An unexpected error occurred for model {model}: {str(e)}"
        sse_error = {"model": model, "error": error_message, "done": True}
        yield f"data: {json.dumps(sse_error)}\n\n"

@app.get("/api/v1/models")
async def get_available_models():
    """Get list of available models from Ollama."""
    try:
        client = AsyncClient()
        models = await client.list()
        return {"models": [model.model for model in models.models]}
    except Exception as e:
        return {"error": f"Failed to get models: {str(e)}"}

@app.post("/api/v1/generate")
async def generate_stream(request: ChatRequest):
    """
    Receives a prompt and a list of models, and streams back responses
    from all models concurrently.
    """
    async def event_generator():
        client = AsyncClient()
        
        # Create a list of streaming tasks for each model
        tasks = [stream_ollama_response(model, request.prompt, client) for model in request.models]
        
        # Create a queue to merge the results from all streams
        queue = asyncio.Queue()

        async def producer(stream_task, q):
            async for item in stream_task:
                await q.put(item)

        # Start all producer tasks
        producer_tasks = [asyncio.create_task(producer(task, queue)) for task in tasks]
        
        # Keep track of finished tasks
        finished_producers = 0
        while finished_producers < len(tasks):
            try:
                # Wait for an item from any stream, with a timeout
                item = await asyncio.wait_for(queue.get(), timeout=0.1)
                yield item
                
                # Check if the yielded item signals the end of a stream
                try:
                    data = json.loads(item.split('data: ')[1])
                    if data.get('done'):
                        finished_producers += 1
                except (json.JSONDecodeError, IndexError):
                    pass # Not a data-containing event, ignore for done check
            except asyncio.TimeoutError:
                # If timeout, check if all producers are done
                if all(p.done() for p in producer_tasks):
                    break

    return StreamingResponse(event_generator(), media_type="text/event-stream")