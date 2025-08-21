#!/usr/bin/env python3
"""
Script to start the AI Model Arena application.
"""

import subprocess
import sys
import os
import time
import webbrowser
from pathlib import Path

def main():
    print("🚀 Starting AI Model Arena...")
    print()
    
    # Check if we're in the right directory
    if not Path("backend").exists() or not Path("frontend").exists():
        print("❌ Error: Please run this script from the ai-model-arena root directory")
        sys.exit(1)
    
    # Check if Ollama is running
    try:
        result = subprocess.run(["ollama", "ps"], capture_output=True, text=True, timeout=5)
        if result.returncode != 0:
            print("❌ Error: Ollama is not running. Please start Ollama first:")
            print("   ollama serve")
            sys.exit(1)
        print("✅ Ollama is running")
    except FileNotFoundError:
        print("❌ Error: Ollama is not installed. Please install Ollama first.")
        sys.exit(1)
    
    # Start the backend server
    print("🔄 Starting backend server...")
    backend_process = subprocess.Popen(
        ["python", "-m", "uvicorn", "main:app", "--reload", "--host", "127.0.0.1", "--port", "8001"],
        cwd="backend",
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    
    # Wait for server to start
    print("⏳ Waiting for server to start...")
    time.sleep(5)
    
    # Check if server is running
    try:
        import requests
        response = requests.get("http://127.0.0.1:8001/api/v1/models", timeout=5)
        if response.status_code == 200:
            print("✅ Backend server is running on http://127.0.0.1:8001")
        else:
            print("❌ Backend server failed to start properly")
            sys.exit(1)
    except Exception as e:
        print(f"❌ Backend server failed to start: {e}")
        sys.exit(1)
    
    # Open the frontend
    frontend_path = Path("frontend/index.html").absolute()
    print(f"🌐 Opening frontend at: {frontend_path}")
    print()
    print("📝 Instructions:")
    print("1. The frontend should open in your browser")
    print("2. Select which models you want to challenge")
    print("3. Type a prompt and click 'Send' to test multiple models")
    print("4. Use the thinking mode toggle to show/hide reasoning")
    print("5. Copy responses with the copy buttons")
    print("6. Press Ctrl+C to stop the server")
    print()
    
    try:
        webbrowser.open(f"file://{frontend_path}")
    except Exception as e:
        print(f"⚠️  Could not open browser automatically: {e}")
        print(f"   Please open: {frontend_path}")
    
    try:
        # Keep the server running
        backend_process.wait()
    except KeyboardInterrupt:
        print("\n🛑 Stopping server...")
        backend_process.terminate()
        backend_process.wait()
        print("✅ Server stopped")

if __name__ == "__main__":
    main()
