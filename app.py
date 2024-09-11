from flask import Flask, request, jsonify, render_template
import openai
import io
import sys

app = Flask(__name__)

# Set your OpenAI API key here
client = openai.OpenAI(api_key="asdf")


# Route to serve the index.html file
@app.route('/')
def index():
    return render_template('index.html')


# Endpoint for running Python code
@app.route('/run-python', methods=['POST'])
def run_python():
    code = request.json.get('code')
    output = io.StringIO()
    sys.stdout = output

    try:
        exec(code)
    except Exception as e:
        return jsonify({'error': str(e)})

    sys.stdout = sys.__stdout__  # Reset stdout
    return jsonify({'output': output.getvalue()})

# Endpoint for ChatGPT interaction
@app.route('/chat', methods=['POST'])
def chat():
    prompt = request.json.get('prompt')
    response = client.chat.completions.create(
        messages=[
            {
                "role": "user",
                "content": "You are a copilot. We have already defined the following functions in Python: webgl_add_vertex(x, y), which adds to a vertex buffer, and webgl_render_scene(), which renders the scene. The buffer draw line segments from consecutive vertices. Help the user write procedural generation code. The render window is a WebGL viewport i.e. a box from (-1.0, -1.0) to (1.0, 1.0)"
            },
            {
                "role": "user",
                "content": prompt,
            }
        ],
        model="gpt-3.5-turbo",
    )
    return jsonify({'response': response.choices[0].message.content})

if __name__ == '__main__':
    app.run(port=3100, debug=True)
