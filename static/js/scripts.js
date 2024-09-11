// Function to run Python code and catch errors
const runPythonCode = async () => {
    const pyodide = await loadPyodide(); 
    await pyodide.loadPackage("matplotlib");
    const code = document.getElementById('python-code').value;
    const outputElement = document.getElementById('python-output');
    const errorPopover = document.getElementById('error-popover');

    try {
        // Use Pyodide to execute Python code
        const result = await pyodide.runPythonAsync(code);
        outputElement.textContent = result || "Code executed successfully, no output.";
        errorPopover.style.display = 'none'; // Hide popover if no error
    } catch (error) {
        // Display error and send it to ChatGPT
        outputElement.textContent = `Error: ${error.message}`;
        sendErrorToChatGPT(code, error.message);
    }
};

// Function to send error to ChatGPT
const sendErrorToChatGPT = async (code, errorMessage) => {
    const errorPopover = document.getElementById('error-popover');
    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prompt: `Here's what was requested:\n${document.getElementById('chat-input').value}\n\nHere's the Python code:\n${code}\n\nAnd here's the error:\n${errorMessage}\nPlease suggest a fix.` })
        });

        const result = await response.json();

        // Position and show the popover with the response from ChatGPT
        errorPopover.style.top = `${document.getElementById('python-code').offsetTop + 50}px`;
        errorPopover.style.left = `${document.getElementById('python-code').offsetLeft}px`;
        errorPopover.innerHTML = `<strong>ChatGPT Suggestion:</strong><br>${result.response}`;
        errorPopover.style.display = 'block';
    } catch (fetchError) {
        errorPopover.innerHTML = `<strong>Error sending to ChatGPT:</strong> ${fetchError.message}`;
        errorPopover.style.display = 'block';
    }
};

document.addEventListener('click', (event) => {
    const popover = document.getElementById('error-popover');
    const codeArea = document.getElementById('python-code');

    // Hide popover if the click is outside the popover or the code area
    if (!popover.contains(event.target) && !codeArea.contains(event.target)) {
        popover.style.display = 'none';
    }
});


async function chatWithGPT() {
    const chatInput = document.getElementById('chat-input').value;

    if (!chatInput.trim()) {
        return;
    }

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prompt: "You are a specialist copilot to write matplotlib code for procedural generation. Here's what your user asked for: " + chatInput })
        });

        const result = await response.json();
        const chatOutput = document.getElementById('chat-output');
        const codeStatus = document.getElementById('code-status'); // Code status element

        if (result.response) {
            console.log("Full response: ", result.response);
            
            // Extract the line ranges for Python code
            const lineRanges = extractPythonCodeLineRanges(result.response);

            // Split the response into lines
            const lines = result.response.split("\n");

            // Build the highlighted output
            let highlightedOutput = `You: ${chatInput}\nGPT:\n`;

            let isCode = false; // To track whether we're within a Python code block

            lines.forEach((line, index) => {
                const lineNumber = index + 1;

                // Check if the current line number is within any of the detected Python code ranges
                const isInCodeRange = lineRanges.some(([start, end]) => lineNumber >= start && lineNumber <= end);

                if (isInCodeRange) {
                    // If we're inside a code block, wrap the line with <code> and <pre>
                    if (!isCode) {
                        highlightedOutput += `<div class="code-container"><div class="buttons-panel"><button class='copy-button'>Copy</button><button class='append-button'>Append</button><button class='overwrite-button' onClick="copyCodeToTarget(this)">Overwrite</button></div><pre><code class="language-python">`;
                        isCode = true;
                    }
                    highlightedOutput += `${escapeHTML(line)}\n`;
                } else {
                    // If we're outside a code block, close the code block if needed and add plain text
                    if (isCode) {
                        highlightedOutput += `</code></pre></div>\n`;
                        isCode = false;
                    }
                    if (!((line.trim() === '```python') || (line.trim() === '```'))) {
                        highlightedOutput += `${escapeHTML(line)}\n`;
                    }
                }
            });

            // If the last line was part of a code block, close the code block
            if (isCode) {
                highlightedOutput += `</code></pre></div>\n`;
            }

            // Append the processed output to the chat output
            chatOutput.innerHTML += highlightedOutput;

            // Apply syntax highlighting
            Prism.highlightAll();

            // Update code status based on whether any Python code was detected
            if (lineRanges.length > 0) {
                codeStatus.outerHTML = `<div id="code-status" class="text-center p-4 border bg-blue"><span style="color: white;">Code Detected</span></div>`;
            } else {
                codeStatus.outerHTML = `<div id="code-status" class="text-center p-4 border bg-gray-200"><span class="text-gray-800">Code Not Detected</span></div>`;
            }

        } else {
            chatOutput.textContent += `Error: No response from GPT\n`;
        }
    } catch (error) {
        document.getElementById('chat-output').textContent = `Error: ${error.message}`;
    }
}


const extractPythonCodeLineRanges = (response) => {
    const lines = response.split("\n");
    let lineRanges = [];
    let isCodeBlock = false;
    let startLine = null;

    // Step 1: First, look for blocks that begin with "```python" and end with "```"
    lines.forEach((line, index) => {
        const lineNumber = index + 1;

        if (line.trim() === '```python') {
            isCodeBlock = true;
            startLine = lineNumber; // Mark the start of the Python code block
        } else if (line.trim() === '```' && isCodeBlock) {
            lineRanges.push([startLine + 1, lineNumber - 1]); // Add the range for Python code (excluding the "```" markers)
            isCodeBlock = false;
            startLine = null;
        }
    });

    // Step 2: If no "```python" blocks were found, fall back to the original method
    if (lineRanges.length === 0) {
        let isCode = false;

        const pythonStartPattern = /^(import|from|def|class|\s*#)/; // Recognize typical Python starts
        const pythonContinuePattern = /^[ \t]|^(import|from|def|class|for|if|while|with|try|except|return|yield|else|elif|[a-zA-Z_]\w*\s*=\s*[^=])/; // Added variable assignment detection

        lines.forEach((line, index) => {
            const lineNumber = index + 1;

            // If we detect the start of Python code
            if (pythonStartPattern.test(line.trim())) {
                if (!isCode) {
                    isCode = true;
                    startLine = lineNumber; // Mark the start of the code block
                }
            }
            
            // If we're in a code block, check if this line continues valid Python
            if (isCode) {
                if (pythonContinuePattern.test(line) || line.trim() === "") {
                    // Continue the code block
                } else {
                    // End of a code block detected
                    if (startLine !== null) {
                        lineRanges.push([startLine, lineNumber - 1]); // Store the range
                        startLine = null;
                    }
                    isCode = false;
                }
            }
        });

        // Handle the case where the last line is part of a Python code block
        if (isCode && startLine !== null) {
            lineRanges.push([startLine, lines.length]); // Add the final range if still in code
        }
    }

    return lineRanges;
};


// Function to escape HTML to prevent XSS attacks or invalid HTML content
function escapeHTML(str) {
    return str.replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#039;");
}

function copyCodeToTarget(buttonElement) {
    const parentElement = buttonElement.parentElement;

    // Get the parent's next sibling element
    const siblingElement = parentElement.nextElementSibling;

    // Get the child <code> element of the sibling
    const codeElement = siblingElement.querySelector('code');
    
    // Get the content of the <code> element
    const codeContent = codeElement.textContent;

    // Set the content of the element with the specific ID
    const targetElement = document.getElementById('python-code');
    targetElement.textContent = codeContent;
  }


function toggleSidebar() {
    const rendererContainer = document.getElementById('renderer-container');
    rendererContainer.classList.toggle('sidebar');
    rendererContainer.classList.toggle('w-1/2');
    const rendererObject = document.getElementById('canvas');
    rendererObject.classList.toggle('hide-renderer')
}