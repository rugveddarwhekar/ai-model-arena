# AI Model Arena

A web application that allows you to compare responses from multiple local AI models simultaneously. Built with FastAPI backend and vanilla JavaScript frontend.

## Features

- **Multi-model comparison**: Send the same prompt to multiple Ollama models at once
- **Real-time streaming**: See responses as they're generated, token by token
- **Side-by-side display**: Compare model responses in a grid layout
- **Local models**: Uses your local Ollama installation for privacy and speed
- **Modern UI**: Clean, responsive interface with pastel colors
- **Model selection**: Toggle individual models on/off
- **Thinking mode**: Separate and toggle thinking process from final responses
- **Copy functionality**: Easy copying of responses and thinking content
- **Collapsible sections**: Expand/collapse response boxes
- **Stop generation**: Cancel ongoing requests at any time

## Prerequisites

1. **Ollama**: Install and set up Ollama with your preferred models
   ```bash
   # Install Ollama (if not already installed)
   curl -fsSL https://ollama.ai/install.sh | sh
   
   # Start Ollama service
   ollama serve
   
   # Pull some models (examples)
   ollama pull llama3.2
   ollama pull qwen3
   ollama pull gemma3
   ollama pull deepseek-r1
   ollama pull gpt-oss
   ```

2. **Python 3.8+**: Make sure Python is installed on your system

## Quick Start

1. **Clone and navigate to the project**:
   ```bash
   cd ai-model-arena
   ```

2. **Set up the backend**:
   ```bash
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   pip install ollama
   ```

3. **Start the application**:
   ```bash
   # From the project root
   python3 start_app.py
   ```

   Or manually:
   ```bash
   # Terminal 1: Start backend
   cd backend
   source .venv/bin/activate
   python -m uvicorn main:app --reload --host 127.0.0.1 --port 8001
   
   # Terminal 2: Open frontend
   open frontend/index.html  # On macOS
   # or
   xdg-open frontend/index.html  # On Linux
   # or just open the file in your browser
   ```

4. **Use the application**:
   - Select which models you want to challenge
   - Type a prompt in the text area
   - Click "Send" to see responses from all selected models
   - Watch as responses stream in real-time
   - Use the thinking mode toggle to show/hide reasoning process
   - Copy responses with the copy buttons

## Configuration

### Adding/Removing Models

Edit `frontend/script.js` and modify the `AVAILABLE_MODELS` array:

```javascript
const AVAILABLE_MODELS = ["llama3.2", "qwen3", "gemma3", "deepseek-r1", "gpt-oss"];
```

Make sure the models you list are available in your Ollama installation.

### Changing the API URL

If you change the backend port, update the URLs in `frontend/script.js`:

```javascript
const API_URL = "http://127.0.0.1:8001/api/v1/generate";
const MODELS_STATUS_URL = "http://127.0.0.1:8001/api/v1/models";
```

## Troubleshooting

### Models not responding
- Make sure Ollama is running: `ollama serve`
- Check if models are available: `ollama list`
- Try warming up models: `ollama run model_name "test"`

### Backend connection issues
- Verify the backend is running on the correct port
- Check that the virtual environment is activated
- Ensure all dependencies are installed

### Frontend not loading
- Open the browser's developer console for error messages
- Verify the API URLs are correct
- Check that the backend server is accessible

## API Endpoints

- `GET /api/v1/models` - List available models
- `POST /api/v1/generate` - Generate responses from multiple models

## Architecture

- **Backend**: FastAPI with async streaming responses
- **Frontend**: Vanilla JavaScript with Server-Sent Events (SSE)
- **Models**: Ollama Python library for model communication
- **Streaming**: Real-time token-by-token response streaming
- **UI**: Modern responsive design with CSS Grid and Flexbox

## License

MIT License
