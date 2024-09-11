const canvas = document.getElementById("viewport");
const gl = canvas.getContext("webgl");

if (!gl) {
  console.error("WebGL not supported, falling back on experimental-webgl");
  gl = canvas.getContext("experimental-webgl");
}

// L-System parameters
const axiom = "F";
const rules = {
  "F": "F[+F]F[-F]F"
};
const angle = 25 * Math.PI / 180;
let iterations = 4;

// Define L-System
function generateLSystem(axiom, rules, iterations) {
  let result = axiom;
  for (let i = 0; i < iterations; i++) {
    let newResult = "";
    for (const char of result) {
      newResult += rules[char] || char;
    }
    result = newResult;
  }
  return result;
}

// Create the road network
const roadSystem = generateLSystem(axiom, rules, iterations);

// Turtle parameters
let positionStack = [];
let angleStack = [];
let posX = 0;
let posY = 0;
let direction = 0;

let vertices = [];

// Turtle interpretation of the L-System
function turtleInterpret(system, stepSize) {
  for (const char of system) {
    if (char === "F") {
      let newX = posX + stepSize * Math.cos(direction);
      let newY = posY + stepSize * Math.sin(direction);

      vertices.push(posX, posY, newX, newY);

      posX = newX;
      posY = newY;
    } else if (char === "+") {
      direction += angle;
    } else if (char === "-") {
      direction -= angle;
    } else if (char === "[") {
      positionStack.push([posX, posY]);
      angleStack.push(direction);
    } else if (char === "]") {
      [posX, posY] = positionStack.pop();
      direction = angleStack.pop();
    }
  }
}

turtleInterpret(roadSystem, 0.05);

// Shader sources
const vertexShaderSource = `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const fragmentShaderSource = `
  precision mediump float;
  void main() {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); // Black color
  }
`;

// Create shaders
function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Error compiling shader!", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

// Create program
const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);
if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
  console.error("Program failed to link!", gl.getProgramInfoLog(program));
  throw new Error("Failed to link WebGL program");
}

gl.useProgram(program);

// Create buffer for the road network
const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

// Get position attribute location
const positionLocation = gl.getAttribLocation(program, "position");
gl.enableVertexAttribArray(positionLocation);
gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

// Draw function
function drawScene() {
  gl.clear(gl.COLOR_BUFFER_BIT);
  
  // Draw the lines
  gl.drawArrays(gl.LINES, 0, vertices.length / 2);
}

// Set clear color to white, fully opaque
gl.clearColor(1.0, 1.0, 1.0, 1.0);

// Render the road network
drawScene();
