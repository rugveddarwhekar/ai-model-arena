document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('chat-form');
    const promptInput = document.getElementById('prompt-input');
    const sendButton = document.getElementById('send-button');
    const stopButton = document.getElementById('stop-button');
    const responseContainer = document.getElementById('response-container');
    const modelTogglesContainer = document.getElementById('model-toggles');
    const showThinkingToggle = document.getElementById('show-thinking');

    const API_URL = "http://127.0.0.1:8001/api/v1/generate";
    const MODELS_STATUS_URL = "http://127.0.0.1:8001/api/v1/models";
    
    const AVAILABLE_MODELS = ["qwen3", "llama3.2", "gemma3", "deepseek-r1", "gpt-oss"];
    
    let selectedModels = [...AVAILABLE_MODELS];
    let isGenerating = false;
    let abortController = null;
    let modelElements = {};
    let modelResponses = {};

    function createCopyButton(text, type) {
        const button = document.createElement('button');
        button.className = 'copy-button';
        button.textContent = 'Copy';
        button.title = `Copy ${type}`;
        
        button.addEventListener('click', async (e) => {
            e.stopPropagation();
            try {
                await navigator.clipboard.writeText(text);
                button.textContent = 'Copied!';
                button.classList.add('copied');
                setTimeout(() => {
                    button.textContent = 'Copy';
                    button.classList.remove('copied');
                }, 2000);
            } catch (err) {
                console.error('Failed to copy text:', err);
                button.textContent = 'Failed';
                setTimeout(() => {
                    button.textContent = 'Copy';
                }, 2000);
            }
        });
        
        return button;
    }

    function separateThinkingAndResponse(text) {
        const thinkingPatterns = [
            /<thinking>(.*?)<\/thinking>/gs,
            /<reasoning>(.*?)<\/reasoning>/gs,
            /<thought>(.*?)<\/thought>/gs,
            /\[thinking\](.*?)\[\/thinking\]/gs,
            /\[reasoning\](.*?)\[\/reasoning\]/gs,
            /Let me think about this\.(.*?)(?=\n\n|\n[A-Z]|$)/gs,
            /First, let me analyze this\.(.*?)(?=\n\n|\n[A-Z]|$)/gs,
            /Let me break this down\.(.*?)(?=\n\n|\n[A-Z]|$)/gs
        ];

        for (const pattern of thinkingPatterns) {
            const match = text.match(pattern);
            if (match) {
                const thinking = match[1].trim();
                const response = text.replace(pattern, '').trim();
                return { thinking, response };
            }
        }

        // Check for common thinking indicators
        const thinkingIndicators = [
            'Let me think',
            'First, let me',
            'Let me analyze',
            'Let me break this down',
            'I need to think',
            'Let me consider',
            'Thinking about this'
        ];

        const lines = text.split('\n');
        let thinkingLines = [];
        let responseLines = [];
        let foundThinking = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            const isThinkingLine = thinkingIndicators.some(indicator => 
                line.toLowerCase().includes(indicator.toLowerCase())
            );

            if (isThinkingLine && !foundThinking) {
                foundThinking = true;
                thinkingLines.push(line);
            } else if (foundThinking && line.length > 0) {
                // If we find a substantial response after thinking, switch to response
                if (line.length > 20 || responseLines.length > 0) {
                    responseLines.push(line);
                } else {
                    thinkingLines.push(line);
                }
            } else if (!foundThinking) {
                responseLines.push(line);
            } else {
                responseLines.push(line);
            }
        }

        const thinking = thinkingLines.join('\n').trim();
        const response = responseLines.join('\n').trim();

        if (thinking && response) {
            return { thinking, response };
        }

        return { thinking: '', response: text };
    }

    function createModelToggle(modelName, isAvailable = true) {
        const toggle = document.createElement('label');
        toggle.className = `model-toggle ${isAvailable ? 'available' : 'unavailable'}`;
        if (selectedModels.includes(modelName)) {
            toggle.classList.add('active');
        }
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = selectedModels.includes(modelName);
        checkbox.disabled = !isAvailable;
        
        const statusIndicator = document.createElement('span');
        statusIndicator.className = `status-indicator ${isAvailable ? 'available' : 'unavailable'}`;
        
        const text = document.createElement('span');
        text.textContent = modelName;
        
        toggle.appendChild(checkbox);
        toggle.appendChild(statusIndicator);
        toggle.appendChild(text);
        
        toggle.addEventListener('click', (e) => {
            if (!isAvailable) return;
            
            const isChecked = checkbox.checked;
            if (isChecked) {
                selectedModels = selectedModels.filter(m => m !== modelName);
                toggle.classList.remove('active');
            } else {
                selectedModels.push(modelName);
                toggle.classList.add('active');
            }
            checkbox.checked = !isChecked;
        });
        
        return toggle;
    }

    function createModelColumn(modelName) {
        const column = document.createElement('div');
        column.className = 'model-column';
        column.dataset.model = modelName;
        
        const header = document.createElement('div');
        header.className = 'model-header';
        
        const title = document.createElement('h2');
        title.textContent = modelName;
        
        const toggleIcon = document.createElement('span');
        toggleIcon.className = 'toggle-icon';
        toggleIcon.innerHTML = '▼';
        
        header.appendChild(title);
        header.appendChild(toggleIcon);
        
        const content = document.createElement('div');
        content.className = 'model-content';
        
        const responseText = document.createElement('div');
        responseText.className = 'response-text';
        responseText.textContent = 'Waiting for response...';
        
        content.appendChild(responseText);
        column.appendChild(header);
        column.appendChild(content);
        
        header.addEventListener('click', () => {
            column.classList.toggle('collapsed');
        });
        
        return column;
    }

    function updateResponseDisplay(modelName, text, isError = false) {
        const modelEl = modelElements[modelName];
        if (!modelEl) return;

        if (isError) {
            modelEl.innerHTML = `<div class="response-text error">${text}</div>`;
            return;
        }

        // Store the full response
        modelResponses[modelName] = text;

        // Separate thinking and response
        const { thinking, response } = separateThinkingAndResponse(text);
        
        let html = '';
        
        if (thinking && showThinkingToggle.checked) {
            const thinkingDiv = document.createElement('div');
            thinkingDiv.className = 'thinking-mode';
            thinkingDiv.textContent = thinking;
            thinkingDiv.appendChild(createCopyButton(thinking, 'thinking'));
            html += thinkingDiv.outerHTML;
        }
        
        if (response) {
            const responseDiv = document.createElement('div');
            responseDiv.className = 'response-content';
            responseDiv.textContent = response;
            responseDiv.appendChild(createCopyButton(response, 'response'));
            html += responseDiv.outerHTML;
        }
        
        if (!thinking && !response) {
            html = `<div class="response-text">${text}</div>`;
        }
        
        modelEl.innerHTML = html;
        modelEl.scrollTop = modelEl.scrollHeight;
    }

    function updateAllResponseDisplays() {
        Object.keys(modelResponses).forEach(modelName => {
            updateResponseDisplay(modelName, modelResponses[modelName]);
        });
    }

    async function checkModelStatus() {
        try {
            const response = await fetch(MODELS_STATUS_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data.models || [];
        } catch (error) {
            console.error('Error checking model status:', error);
            return [];
        }
    }

    async function initializeModelToggles() {
        const availableModels = await checkModelStatus();
        console.log('Available models:', availableModels);
        
        modelTogglesContainer.innerHTML = '';
        
        AVAILABLE_MODELS.forEach(modelName => {
            const isAvailable = availableModels.some(available => 
                available.includes(modelName) || available === modelName
            );
            const toggle = createModelToggle(modelName, isAvailable);
            modelTogglesContainer.appendChild(toggle);
        });
        
        if (selectedModels.length === 0) {
            selectedModels = AVAILABLE_MODELS.filter(model => 
                availableModels.some(available => available.includes(model))
            );
        }
    }

    function updateResponseGrid() {
        responseContainer.innerHTML = '';
        modelElements = {};
        modelResponses = {};
        
        if (selectedModels.length === 0) {
            responseContainer.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--text-secondary);">
                    <h3>No models selected</h3>
                    <p>Please select at least one model to continue.</p>
                </div>
            `;
            return;
        }
        
        responseContainer.style.gridTemplateColumns = `repeat(${selectedModels.length}, 1fr)`;
        
        selectedModels.forEach(modelName => {
            const column = createModelColumn(modelName);
            responseContainer.appendChild(column);
            modelElements[modelName] = column.querySelector('.model-content');
        });
    }

    function updateButtonStates() {
        const hasSelectedModels = selectedModels.length > 0;
        const hasPrompt = promptInput.value.trim().length > 0;
        
        sendButton.disabled = !hasSelectedModels || !hasPrompt || isGenerating;
        stopButton.disabled = !isGenerating;
        
        if (isGenerating) {
            sendButton.innerHTML = '<span class="loading-indicator"></span><span class="button-text">Generating...</span>';
        } else {
            sendButton.innerHTML = '<span class="button-text">Send</span>';
        }
    }

    function handleStopGeneration() {
        if (abortController) {
            abortController.abort();
        }
        isGenerating = false;
        updateButtonStates();
        
        Object.values(modelElements).forEach(element => {
            if (element.textContent === 'Waiting for response...') {
                element.innerHTML = '<div class="response-text error">Generation stopped</div>';
            }
        });
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        const prompt = promptInput.value.trim();
        if (!prompt || selectedModels.length === 0) return;

        isGenerating = true;
        updateButtonStates();
        updateResponseGrid();

        abortController = new AbortController();

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, models: selectedModels }),
                signal: abortController.signal
            });

            if (!response.ok || !response.body) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let modelBuffers = {};

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                
                const events = buffer.split('\n\n');
                buffer = events.pop();

                for (const event of events) {
                    if (!event.startsWith('data:')) continue;
                    
                    try {
                        const jsonData = event.substring(5).trim();
                        const data = JSON.parse(jsonData);
                        
                        if (data.error) {
                            updateResponseDisplay(data.model, `[ERROR]: ${data.error}`, true);
                            
                            if (data.error.includes('loading into memory')) {
                                const errorText = `[ERROR]: ${data.error}\n\n💡 Try warming up the model first by running: ollama run ${data.model} "test"`;
                                updateResponseDisplay(data.model, errorText, true);
                            }
                        } else {
                            // Initialize buffer for this model if not exists
                            if (!modelBuffers[data.model]) {
                                modelBuffers[data.model] = '';
                            }
                            
                            modelBuffers[data.model] += data.token;
                            updateResponseDisplay(data.model, modelBuffers[data.model]);
                        }
                    } catch (error) {
                        console.error('Error parsing SSE data:', error);
                    }
                }
            }

        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Request was aborted');
            } else {
                console.error('Error fetching stream:', error);
                responseContainer.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 2rem;">
                        <h3 style="color: var(--accent-danger);">Connection Error</h3>
                        <p style="color: var(--text-secondary);">Failed to connect to the backend server. Please make sure the server is running.</p>
                    </div>
                `;
            }
        } finally {
            isGenerating = false;
            updateButtonStates();
        }
    }

    promptInput.addEventListener('input', updateButtonStates);
    stopButton.addEventListener('click', handleStopGeneration);
    form.addEventListener('submit', handleFormSubmit);
    showThinkingToggle.addEventListener('change', updateAllResponseDisplays);

    initializeModelToggles().then(() => {
        updateResponseGrid();
        updateButtonStates();
    });
});