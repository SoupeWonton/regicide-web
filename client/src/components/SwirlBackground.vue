<script setup lang="ts">
// Balatro-style living background: a slow domain-warped swirl in the game's
// palette (deep indigo, dried blood, tarnished gold), rendered at half
// resolution and ~30fps. If WebGL is unavailable the body gradient remains.
import { onMounted, onBeforeUnmount, ref } from 'vue'

const canvas = ref<HTMLCanvasElement | null>(null)
let gl: WebGLRenderingContext | null = null
let raf = 0
let lastFrame = 0

const FRAG = `
precision mediump float;
uniform vec2 u_res;
uniform float u_t;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  float r = length(uv);
  float ang = atan(uv.y, uv.x);

  float swirl = ang + 1.6 * r - u_t * 0.045 + 2.6 * fbm(uv * 1.4 + u_t * 0.018);
  float bands = fbm(vec2(swirl * 1.15, r * 2.8 - u_t * 0.025));

  vec3 deep    = vec3(0.043, 0.035, 0.094);
  vec3 indigo  = vec3(0.105, 0.082, 0.205);
  vec3 crimson = vec3(0.265, 0.095, 0.125);
  vec3 gold    = vec3(0.55, 0.42, 0.13);

  vec3 col = mix(deep, indigo, smoothstep(0.25, 0.85, bands));
  col = mix(col, crimson, smoothstep(0.58, 0.95, bands) * 0.55);
  col += gold * pow(max(0.0, bands - 0.8) * 5.0, 2.0) * 0.30;
  col *= 1.0 - 0.55 * smoothstep(0.35, 1.15, r);

  gl_FragColor = vec4(col, 1.0);
}`

const VERT = `
attribute vec2 a_pos;
void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }`

function resize() {
  const c = canvas.value
  if (!c || !gl) return
  const scale = 0.5 // half-res: the blur of a soft background for free
  c.width = Math.max(2, Math.floor(window.innerWidth * scale))
  c.height = Math.max(2, Math.floor(window.innerHeight * scale))
  gl.viewport(0, 0, c.width, c.height)
}

onMounted(() => {
  const c = canvas.value!
  gl = c.getContext('webgl', { antialias: false, depth: false, stencil: false })
  if (!gl) return

  const compile = (type: number, src: string) => {
    const sh = gl!.createShader(type)!
    gl!.shaderSource(sh, src)
    gl!.compileShader(sh)
    return sh
  }
  const prog = gl.createProgram()!
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT))
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG))
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { gl = null; return }
  gl.useProgram(prog)

  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(prog, 'a_pos')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

  const uRes = gl.getUniformLocation(prog, 'u_res')
  const uT = gl.getUniformLocation(prog, 'u_t')
  resize()
  window.addEventListener('resize', resize)

  const g = gl
  const t0 = performance.now()
  const frame = (t: number) => {
    raf = requestAnimationFrame(frame)
    if (document.hidden || t - lastFrame < 33) return // ~30fps, sleep when hidden
    lastFrame = t
    g.uniform2f(uRes, c.width, c.height)
    g.uniform1f(uT, (t - t0) / 1000)
    g.drawArrays(g.TRIANGLES, 0, 3)
  }
  raf = requestAnimationFrame(frame)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('resize', resize)
})
</script>

<template>
  <canvas ref="canvas" class="fixed inset-0 w-full h-full -z-10 pointer-events-none" aria-hidden="true" />
</template>
