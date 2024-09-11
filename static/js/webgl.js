let vertices = [];

window.onload = function() {
  const canvas = document.getElementById("viewport");
  const gl = canvas.getContext("webgl");

  if (!gl) {
    console.error("WebGL not supported, falling back on experimental-webgl");
    gl = canvas.getContext("experimental-webgl");
  }

  const vertexShaderSource = `
    attribute vec2 position;
    void main() {
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  const fragmentShaderSource = `
    precision mediump float;
    void main() {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    }
  `;

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

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Program failed to link!", gl.getProgramInfoLog(program));
    throw new Error("Failed to link WebGL program");
  }

  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

  const positionLocation = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

  function clearCanvas() {
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  function drawScene() {
    clearCanvas();

    // Update the buffer with the collected vertices
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    if (vertices.length >= 2) { // Check that we have at least 3 pairs of vertices to draw a triangle
      console.log('Drawing:', vertices);
      gl.drawArrays(gl.LINES, 0, vertices.length / 2); // Draw using LINES mode
    }

    // After drawing, we can reset the vertices array if needed
  }

  window.webgl_add_vertex = function(x, y) {
    console.log('Adding vertex:', x, y);
    vertices.push(x, y);  // Add the single vertex
  };

  window.webgl_render_scene = function() {
    drawScene();  // Call drawScene once all vertices are added
  };

  clearCanvas();
};
