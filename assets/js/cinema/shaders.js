/*
 * shaders.js — the GLSL behind the painted stage.
 *
 * PAINT_FRAG draws one or two paintings to the whole screen:
 *   - each painting has its own camera (centre, zoom, roll) and a depth map, so the foreground slides
 *     against the background with the pointer and spreads apart as the camera pushes in (2.5D);
 *   - the sky and water stream along their own brushstrokes (flow map, two phases, contrast kept);
 *   - a raking light lifts the impasto, and the brightest paint (stars, lanterns, bulbs) breathes;
 *   - between two paintings one of the painterly transitions decides, pixel by pixel, which one shows.
 */
export const PAINT_VERT = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

export const PAINT_FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D tA, tAuxA, tB, tAuxB, tNoise;
uniform vec4 uCamA, uCamB;     // centre x, centre y (0 = top), zoom, roll
uniform vec4 uFxA, uFxB;       // depth push, flow amount, glow, image aspect
uniform vec2 uPar;             // pointer parallax
uniform float uAspect, uTime, uFlowT, uMix, uType, uRelief;
uniform vec2 uOrigin, uDir;    // where the transition opens (screen uv, y up) and which way it sweeps
uniform vec3 uGrade;           // dim, saturation, vignette
uniform vec3 uGold;

float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

vec3 paint(sampler2D tex, sampler2D aux, vec4 cam, vec4 fx, vec2 suv) {
  float ia = fx.w;
  vec2 p = suv - 0.5; p.x *= uAspect;
  float cr = cos(cam.w), sr = sin(cam.w);
  p = vec2(cr * p.x - sr * p.y, sr * p.x + cr * p.y);
  float fit = uAspect > ia ? ia / uAspect : 1.0;
  vec2 q = vec2(p.x / ia, p.y) * fit / cam.z;
  vec2 uv = vec2(cam.x, 1.0 - cam.y) + q;

  // depth: near things move with the pointer and spread from the centre as the camera pushes in
  vec2 off = vec2(0.0);
  for (int i = 0; i < 2; i++) {
    float d = texture2D(aux, uv + off).b;
    off = (d - 0.3) * (uPar / cam.z - q * fx.x * 0.22);
  }
  uv += off;

  vec3 a = texture2D(aux, uv).rgb;
  vec2 f = a.rg * 2.0 - 1.0;
  float fm = length(f);
  vec3 base = texture2D(tex, uv).rgb;
  vec3 col = base;
  if (fm > 0.03 && fx.y > 0.0) {
    // the paint slides along its strokes in two overlapping phases; the blend keeps the stroke contrast
    vec2 fl = vec2(f.x / ia, -f.y) * 0.022 * fx.y;
    float n = texture2D(tNoise, uv * vec2(2.0 * ia, 2.0)).r;
    float t = uFlowT + n * 0.6;
    float p0 = fract(t), p1 = fract(t + 0.5);
    float w = abs(1.0 - 2.0 * p0);
    vec3 s0 = texture2D(tex, uv - fl * (p0 - 0.5)).rgb;
    vec3 s1 = texture2D(tex, uv - fl * (p1 - 0.5)).rgb;
    vec3 m = texture2D(tex, uv, 3.5).rgb;
    vec3 moving = m + (mix(s0, s1, w) - m) / sqrt((1.0 - w) * (1.0 - w) + w * w);
    col = mix(base, moving, smoothstep(0.03, 0.12, fm));
  }
  float L = lum(col);
  if (uRelief > 0.0) {
    // impasto: a low light from the upper left catches one side of every ridge of paint
    vec2 px = vec2(1.0 / ia, 1.0) / (900.0 * cam.z);
    float lx = lum(texture2D(tex, uv + vec2(px.x, 0.0)).rgb);
    float ly = lum(texture2D(tex, uv + vec2(0.0, px.y)).rgb);
    vec2 light = normalize(vec2(-0.7 + uPar.x * 14.0, 0.7 + uPar.y * 14.0));
    float ridge = dot(vec2(L - lx, L - ly), light);
    col += col * clamp(ridge * 3.2, -0.22, 0.3) * uRelief;
  }
  // lights breathe: the brightest paint pulses a little, each patch out of step with its neighbours
  float tw = 0.5 + 0.5 * sin(uTime * 1.3 + texture2D(tNoise, uv * 5.0).g * 6.2832);
  col += col * smoothstep(0.6, 0.95, L) * (fx.z - 1.0 + 0.09 * tw);
  return col;
}

vec2 rot(vec2 p, float a) { float c = cos(a), s = sin(a); return vec2(c * p.x - s * p.y, s * p.x + c * p.y); }

void main() {
  vec2 suv = vUv;
  vec3 col;
  if (uMix <= 0.0) {
    col = paint(tA, tAuxA, uCamA, uFxA, suv);
  } else if (uMix >= 1.0) {
    col = paint(tB, tAuxB, uCamB, uFxB, suv);
  } else {
    float m = uMix;
    vec2 p = suv - uOrigin; p.x *= uAspect;
    float dist = length(p);
    float ang = atan(p.y, p.x);
    vec2 sa = suv, sb = suv;
    float mask = 0.0, edge = 0.0, bloom = 0.0;
    if (uType < 0.5) {
      // portal: a ragged ring of light opens from a point, and the old painting winds around it
      float n = texture2D(tNoise, vec2(ang * 0.55, dist * 1.3)).r * 0.6 + texture2D(tNoise, suv * 3.0).g * 0.4;
      float r = pow(m, 1.7) * 2.1 * max(uAspect, 1.0);
      float e = dist - r + (n - 0.5) * 0.2 * (0.25 + m);
      mask = 1.0 - smoothstep(-0.035, 0.035, e);
      edge = exp(-abs(e) * 15.0);
      vec2 pr = rot(p, m * m * 2.0 * exp(-dist * 2.4)); pr.x /= uAspect;
      sa = uOrigin + pr;
      bloom = exp(-dist * dist * (7.0 - 5.0 * m)) * sin(3.14159 * m);
    } else if (uType < 1.5) {
      // brush / pour: a loaded brush sweeps across, every bristle running a little ahead or behind
      vec2 dir = normalize(uDir);
      vec2 pp = (suv - 0.5) * vec2(uAspect, 1.0);
      float along = dot(pp, dir), across = dot(pp, vec2(-dir.y, dir.x));
      float span = 0.5 * (abs(dir.x) * uAspect + abs(dir.y));
      float bristle = texture2D(tNoise, vec2(across * 1.3, 0.37)).r * 0.5
                    + texture2D(tNoise, vec2(across * 7.0, 0.71)).g * 0.3
                    + texture2D(tNoise, vec2(across * 3.0, along * 0.3)).b * 0.2;
      float lead = mix(-span - 0.62, span + 0.06, m) + bristle * 0.62;
      float e = along - lead;
      mask = 1.0 - smoothstep(-0.02, 0.03, e);
      edge = exp(-abs(e) * 13.0);
    } else {
      // swirl: the old painting winds up like a spiral of sky and unwinds as the new one
      float fall = exp(-dist * 1.5);
      vec2 pa = rot(p, m * m * 3.4 * fall); pa.x /= uAspect; sa = uOrigin + pa;
      vec2 pb = rot(p, -(1.0 - m) * (1.0 - m) * 3.4 * fall); pb.x /= uAspect; sb = uOrigin + pb;
      float n = texture2D(tNoise, vec2(ang * 0.5 + dist * 1.6, dist * 0.7)).r;
      float e = dist * 0.6 + (n - 0.5) * 0.55 - (m * 1.75 - 0.3);
      mask = 1.0 - smoothstep(-0.07, 0.07, e);
      edge = exp(-abs(e) * 9.0) * 0.6;
      bloom = exp(-dist * dist * 5.0) * sin(3.14159 * m) * 0.5;
    }
    vec3 ca = mask < 1.0 ? paint(tA, tAuxA, uCamA, uFxA, sa) : vec3(0.0);
    vec3 cb = mask > 0.0 ? paint(tB, tAuxB, uCamB, uFxB, sb) : vec3(0.0);
    col = mix(ca, cb, mask);
    float lit = sin(3.14159 * m);
    col += uGold * edge * lit * 0.6;
    col += uGold * bloom * 0.7;
  }
  float l = lum(col);
  col = mix(vec3(l), col, uGrade.y);
  col *= 1.0 - uGrade.x;
  vec2 v = vUv - 0.5;
  col *= 1.0 - uGrade.z * dot(v, v) * 1.5;
  col += (texture2D(tNoise, gl_FragCoord.xy / 64.0).b - 0.5) * 0.03;
  gl_FragColor = vec4(col, 1.0);
}
`;

/* Motes of paint in the air: petals, embers, pollen, spray. Screen-space points that drift with the scene. */
export const DUST_VERT = /* glsl */`
attribute vec4 seed;
uniform vec2 uOffset, uPar;
uniform float uSize, uPx, uTime, uSwirl;
varying float vA; varying float vK;
void main() {
  float sp = 0.45 + seed.w * 0.9;
  vec2 p = fract(seed.xy + uOffset * sp);
  p += vec2(sin(uTime * (0.3 + seed.z) + seed.w * 40.0), cos(uTime * (0.24 + seed.w) + seed.z * 31.0)) * 0.012 * uSwirl;
  p = (p * 2.0 - 1.0) * 1.08 + uPar * (0.4 + seed.z) * 3.0;
  gl_Position = vec4(p, 0.0, 1.0);
  gl_PointSize = uSize * uPx * (0.35 + seed.z * 1.1);
  vA = 0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * (0.8 + seed.w * 1.4) + seed.z * 50.0));
  vK = seed.w;
}
`;
export const DUST_FRAG = /* glsl */`
precision mediump float;
uniform vec3 uColA, uColB;
uniform float uAlpha;
varying float vA; varying float vK;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = dot(c, c);
  float a = smoothstep(0.25, 0.02, d);
  gl_FragColor = vec4(mix(uColA, uColB, vK), a * vA * uAlpha);
}
`;

/* The painted globe: a canvas texture of brushed seas and lit countries, shaded like a ball of wet paint. */
export const GLOBE_VERT = /* glsl */`
varying vec2 vUv; varying vec3 vN;
void main() { vUv = uv; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
export const GLOBE_FRAG = /* glsl */`
precision highp float;
uniform sampler2D tMap, tNoise;
uniform float uAlpha, uTime;
varying vec2 vUv; varying vec3 vN;
void main() {
  vec3 col = texture2D(tMap, vUv).rgb;
  vec3 n = normalize(vN);
  float lam = clamp(dot(n, normalize(vec3(-0.45, 0.5, 0.75))), 0.0, 1.0);
  float rim = pow(1.0 - clamp(n.z, 0.0, 1.0), 2.4);
  col *= 0.5 + 0.62 * lam;
  col += vec3(0.98, 0.78, 0.30) * rim * 0.55;
  col += (texture2D(tNoise, vUv * vec2(24.0, 12.0)).r - 0.5) * 0.05;
  gl_FragColor = vec4(col, uAlpha);
}
`;
export const HALO_FRAG = /* glsl */`
precision highp float;
uniform float uAlpha;
varying vec2 vUv;
void main() {
  float d = length(vUv - 0.5) * 2.0;
  float a = smoothstep(1.0, 0.72, d) * smoothstep(0.62, 0.8, d);
  float glow = exp(-max(0.0, d - 0.74) * 9.0) * step(0.72, d);
  gl_FragColor = vec4(vec3(0.97, 0.78, 0.32), (a * 0.25 + glow * 0.5) * uAlpha);
}
`;
