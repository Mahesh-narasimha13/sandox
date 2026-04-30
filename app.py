import os
import subprocess
import tempfile
from flask import Flask, request, jsonify

app = Flask(__name__, static_folder='static', static_url_path='')

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/execute', methods=['POST'])
def execute_code():
    data = request.get_json()
    code = data.get('code', '')

    if not code:
        return jsonify({'output': '', 'error': 'No code provided.'})

    # --- THE SANDBOX EXECUTION ENGINE ---
    # We use a temporary file to store the untrusted code
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as temp_file:
        temp_file.write(code)
        temp_file_path = temp_file.name

    output = ""
    error = ""
    status = "success"

    try:
        # We spawn a completely separate OS process to run the code.
        # This provides Process Isolation. If this process crashes, our main server stays alive!
        # We also enforce a strict 3-second TIMEOUT. This prevents infinite loops (CPU exhaustion).
        result = subprocess.run(
            ['python', temp_file_path],
            capture_output=True,
            text=True,
            timeout=3  # Sandbox Resource Limit: Max 3 seconds of execution
        )
        
        output = result.stdout
        if result.stderr:
            error = result.stderr
            status = "error"

    except subprocess.TimeoutExpired:
        # Sandbox caught a runaway process!
        error = "[Sandbox Intervention]\nExecution terminated: Code exceeded the 3-second time limit (Possible infinite loop detected)."
        status = "timeout"
    except Exception as e:
        error = f"System Error: {str(e)}"
        status = "error"
    finally:
        # Always clean up the temporary file
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

    return jsonify({
        'output': output,
        'error': error,
        'status': status
    })

if __name__ == '__main__':
    # Run the server on port 5000
    app.run(debug=True, port=5000)

from flask import Flask, render_template

app = Flask(__name__)

@app.route("/")
def home():
    return render_template("index.html")
