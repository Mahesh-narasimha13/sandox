document.addEventListener('DOMContentLoaded', () => {
    const runBtn = document.getElementById('run-btn');
    const codeEditor = document.getElementById('code-editor');
    const outputArea = document.getElementById('output-area');
    const statusIndicator = document.getElementById('status-indicator');

    // Simple handling for 'Tab' key in textarea
    codeEditor.addEventListener('keydown', function(e) {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = this.selectionStart;
            const end = this.selectionEnd;
            this.value = this.value.substring(0, start) + "    " + this.value.substring(end);
            this.selectionStart = this.selectionEnd = start + 4;
        }
    });

    runBtn.addEventListener('click', async () => {
        const code = codeEditor.value.trim();
        
        if (!code) {
            outputArea.innerHTML = '<span class="error-text">Please enter some code to execute.</span>';
            return;
        }

        // Update UI to running state
        runBtn.disabled = true;
        runBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" class="spinner"/></svg> Running...';
        statusIndicator.className = 'status running';
        statusIndicator.textContent = 'Executing...';
        outputArea.innerHTML = 'Sending code to the Sandbox...';

        try {
            // Send request to Flask backend
            const response = await fetch('/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ code: code })
            });

            const data = await response.json();

            // Update UI with results
            if (data.status === 'success') {
                statusIndicator.className = 'status success';
                statusIndicator.textContent = 'Completed';
                outputArea.innerHTML = `<span class="success-text">${escapeHTML(data.output)}</span>`;
            } else if (data.status === 'timeout') {
                statusIndicator.className = 'status error';
                statusIndicator.textContent = 'Timeout (Intervention)';
                outputArea.innerHTML = `<span class="error-text">${escapeHTML(data.error)}</span>`;
            } else {
                statusIndicator.className = 'status error';
                statusIndicator.textContent = 'Error';
                
                let outputHtml = '';
                if (data.output) {
                    outputHtml += `<span class="success-text">${escapeHTML(data.output)}</span>\n`;
                }
                outputHtml += `<span class="error-text">${escapeHTML(data.error)}</span>`;
                outputArea.innerHTML = outputHtml;
            }

        } catch (error) {
            statusIndicator.className = 'status error';
            statusIndicator.textContent = 'Failed';
            outputArea.innerHTML = `<span class="error-text">Failed to connect to the Sandbox Server.\nEnsure app.py is running.</span>`;
        } finally {
            // Reset button
            runBtn.disabled = false;
            runBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Run Code';
        }
    });

    // Helper to prevent XSS in terminal output
    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }
});
