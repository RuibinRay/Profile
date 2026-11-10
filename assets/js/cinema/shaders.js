/*
 * shaders.js — the GLSL behind the painted stage.
 *
 * PAINT_FRAG draws one or two paintings to the whole screen. For each painting:
 *   - a camera (centre, zoom, roll) frames it;
 *   - three depth layers (near, middle, far) are looked up separately, each shifted by its own depth
 *     as the camera dollies in, orbits or follows the pointer. Where a nearer layer has moved aside,
 *     the layer behind shows colour that was painted in for exactly that purpose (the "fills"), so
 *     nothing stretches and no halo follows a figure;
 *   - the depth that is in focus stays sharp and the rest softens (rack focus);
 *   - the sky and water stream along their own brushstrokes, wheat and leaves lean in the wind, water
 *     ripples, stars and lanterns breathe, and a raking light lifts the impasto;
 *   - where the camera goes in close, a higher-resolution close-up of that region takes over.
 * Between two paintings one of the transitions decides, pixel by pixel, which one shows; each grows out
 * of something in the picture (a star, a lantern's glow, blown petals, a sweep of paint).
 */
export const PAINT_VERT = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

export const PAINT_FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;
// painting A and painting B: the picture, maps a (flow, depth), b (mattes, back depth), c (wind, water, sky),
// the two fills, and the close-up
uniform sampler2D tA, tA1, tA2, tA3, tAf1, tAf2, tAd;
uniform sampler2D tB, tB1, tB2, tB3, tBf1, tBf2, tBd;
uniform sampler2D tNoise;
uniform vec4 uCamA, uCamB;     // centre x, centre y (0 = top), zoom, roll
uniform vec4 uFxA, uFxB;       // dolly, flow amount, glow, image aspect
uniform vec4 uLayA, uLayB;     // depth where the near layer begins, where the middle begins, layers on, how near the middle may come
uniform vec4 uDetA, uDetB;     // close-up: left, top, size (fractions of the painting), weight
uniform vec4 uLensA, uLensB;   // orbit x, orbit y, depth in focus, softness of the rest
uniform vec2 uPar;             // pointer parallax
uniform float uAspect, uTime, uFlowT, uMix, uType, uRelief, uMotion, uWarm;
uniform vec2 uOrigin, uDir;    // where the transition opens (screen uv, y up) and which way it sweeps
uniform vec4 uGrade;           // dim, saturation, vignette, exposure
uniform vec3 uGold, uEdgeA, uEdgeB;

float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec2 rot(vec2 p, float a) { float c = cos(a), s = sin(a); return vec2(c * p.x - s * p.y, s * p.x + c * p.y); }

// one texel of the painting; inside the close-up's region (and only when zoomed in) the close-up replaces it
vec3 pix(sampler2D tex, sampler2D det, vec4 dr, vec2 uv, float bias) {
  vec3 c = texture2D(tex, uv, bias).rgb;
  if (dr.w > 0.0) {
    vec2 d = (uv - vec2(dr.x, 1.0 - dr.y - dr.z)) / dr.z;
    vec2 e = min(d, 1.0 - d);
    float w = smoothstep(0.0, 0.06, min(e.x, e.y)) * dr.w;
    if (w > 0.0) c = mix(c, texture2D(det, d, bias).rgb, w);
  }
  return c;
}

// the colour of one layer at uv: wind and ripples move the point looked at, then the paint streams along its strokes
vec3 layerCol(sampler2D tex, sampler2D a1, sampler2D a3, sampler2D det, vec4 dr, vec2 uv, vec4 fx, float bias, out vec3 mk) {
  float ia = fx.w;
  mk = texture2D(a3, uv).rgb;
  if (uMotion > 0.0 && (mk.r + mk.g) > 0.01) {
    float n = texture2D(tNoise, uv * vec2(1.3 * ia, 1.3) + vec2(uTime * 0.013, 0.0)).r;
    // wind: gusts travel across the picture; whatever they pass leans and springs back
    float gust = sin(dot(uv, vec2(7.0 * ia, 2.6)) - uTime * 0.9 + n * 3.0);
    float lean = (0.6 * gust + 0.4 * sin(uTime * 2.1 + n * 12.0)) * mk.r * uMotion;
    uv += vec2(lean * 0.0030 / ia, lean * 0.0008);
    // water: a fine ripple under the slow drift
    uv.y += sin(uv.x * 90.0 * ia + uTime * 1.7 + n * 6.0) * 0.0007 * mk.g * uMotion;
  }
  vec3 a = texture2D(a1, uv).rgb;
  vec2 f = a.rg * 2.0 - 1.0;
  float fm = length(f);
  vec3 base = pix(tex, det, dr, uv, bias);
  vec3 col = base;
  if (fm > 0.03 && fx.y > 0.0) {
    // the paint slides along its strokes in two overlapping phases; the blend keeps the stroke contrast
    vec2 fl = vec2(f.x / ia, -f.y) * 0.022 * fx.y;
    float n = texture2D(tNoise, uv * vec2(2.0 * ia, 2.0)).r;
    float t = uFlowT + n * 0.6;
    float p0 = fract(t), p1 = fract(t + 0.5);
    float w = abs(1.0 - 2.0 * p0);
    vec3 s0 = pix(tex, det, dr, uv - fl * (p0 - 0.5), bias);
    vec3 s1 = pix(tex, det, dr, uv - fl * (p1 - 0.5), bias);
    vec3 m = texture2D(tex, uv, 3.5 + bias).rgb;
    vec3 moving = m + (mix(s0, s1, w) - m) / sqrt((1.0 - w) * (1.0 - w) + w * w);
    col = mix(base, moving, smoothstep(0.03, 0.12, fm));
  }
  return col;
}

float soft(float e, vec4 lens) { return clamp(abs(e - lens.z) * lens.w * 2.2, 0.0, 4.5); }

vec3 paint(sampler2D tex, sampler2D a1, sampler2D a2, sampler2D a3, sampler2D f1, sampler2D f2, sampler2D det,
           vec4 cam, vec4 fx, vec4 lay, vec4 dr, vec4 lens, vec2 suv) {
  float ia = fx.w;
  vec2 p = suv - 0.5; p.x *= uAspect;
  p = rot(p, cam.w);
  float fit = uAspect > ia ? ia / uAspect : 1.0;
  vec2 q = vec2(p.x / ia, p.y) * fit / cam.z;
  vec2 uv0 = vec2(cam.x, 1.0 - cam.y) + q;
  // how far one unit of depth moves a point: the pointer and the orbit slide it sideways, the dolly spreads it from the centre
  vec2 k = (uPar + vec2(lens.x / ia, lens.y) * 0.030) / cam.z - q * fx.x * 0.22;
  vec3 col, mk;
  vec2 uvTop; float eTop;
  if (lay.z < 0.5) {
    // one plane bent by its depth (the light setting, and until the layers have arrived)
    vec2 off = vec2(0.0); float d = 0.3;
    for (int i = 0; i < 2; i++) { d = texture2D(a1, uv0 + off).b; off = (d - 0.3) * k; }
    uvTop = uv0 + off; eTop = d;
    col = layerCol(tex, a1, a3, det, dr, uvTop, fx, soft(d, lens), mk);
  } else {
    float tN = lay.x, tM = lay.y;
    // near layer
    float e = max(texture2D(a1, uv0).b, tN); vec2 off = (e - 0.3) * k;
    e = max(texture2D(a1, uv0 + off).b, tN); off = (e - 0.3) * k;
    vec2 uvN = uv0 + off;
    float aN = texture2D(a2, uvN).r;
    uvTop = uvN; eTop = e;
    col = vec3(0.0); mk = vec3(0.0);
    if (aN > 0.004) col = layerCol(tex, a1, a3, det, dr, uvN, fx, soft(e, lens), mk);
    if (aN < 0.996) {
      // middle layer, cut from the scene with the near layer gone
      float b0 = texture2D(a2, uv0).b;
      float eM = clamp(b0, tM, lay.w); off = (eM - 0.3) * k;
      eM = clamp(texture2D(a2, uv0 + off).b, tM, lay.w); off = (eM - 0.3) * k;
      vec2 uvM = uv0 + off;
      float aM = texture2D(a2, uvM).g;
      vec3 back = vec3(0.0), mkB = vec3(0.0);
      if (aM > 0.004) {
        back = layerCol(tex, a1, a3, det, dr, uvM, fx, soft(eM, lens), mkB);
        vec4 fl = texture2D(f1, uvM);
        back = mix(back, fl.rgb, fl.a);
      }
      if (aM < 0.996) {
        // far layer
        float eF = min(b0, tM); off = (eF - 0.3) * k;
        eF = min(texture2D(a2, uv0 + off).b, tM); off = (eF - 0.3) * k;
        vec2 uvF = uv0 + off;
        vec3 mkF;
        vec3 farC = layerCol(tex, a1, a3, det, dr, uvF, fx, soft(eF, lens), mkF);
        vec4 fl = texture2D(f2, uvF);
        farC = mix(farC, fl.rgb, fl.a);
        back = mix(farC, back, aM); mkB = mix(mkF, mkB, aM);
        if (aN < 0.5 && aM < 0.5) { uvTop = uvF; eTop = eF; }
      }
      if (aN < 0.5 && aM >= 0.5) { uvTop = uvM; eTop = eM; }
      col = mix(back, col, aN); mk = mix(mkB, mk, aN);
    }
  }
  float L = lum(col);
  if (uRelief > 0.0) {
    // impasto: a low light from the upper left catches one side of every ridge of paint
    vec2 px = vec2(1.0 / ia, 1.0) / (900.0 * cam.z);
    float lx = lum(texture2D(tex, uvTop + vec2(px.x, 0.0)).rgb);
    float ly = lum(texture2D(tex, uvTop + vec2(0.0, px.y)).rgb);
    float l0 = lum(texture2D(tex, uvTop).rgb);
    vec2 light = normalize(vec2(-0.7 + uPar.x * 14.0, 0.7 + uPar.y * 14.0));
    float ridge = dot(vec2(l0 - lx, l0 - ly), light);
    col += col * clamp(ridge * 3.2, -0.22, 0.3) * uRelief * (1.0 - min(1.0, soft(eTop, lens) * 0.5));
  }
  // lights breathe: the brightest paint pulses a little, each patch out of step with its neighbours;
  // in the sky the stars twinkle faster, and water throws back glints
  vec3 nz = texture2D(tNoise, uvTop * 5.0).rgb;
  float tw = 0.5 + 0.5 * sin(uTime * 1.3 + nz.g * 6.2832);
  float bright = smoothstep(0.6, 0.95, L);
  col += col * bright * (fx.z - 1.0 + 0.09 * tw * uMotion);
  float star = pow(max(0.0, sin(uTime * 2.6 + nz.r * 31.0)), 6.0);
  col += col * bright * mk.b * star * 0.22 * uMotion;
  float glint = pow(max(0.0, sin(uvTop.x * 160.0 * ia + uTime * 2.2 + nz.b * 20.0)), 10.0);
  col += vec3(0.9, 0.95, 1.0) * mk.g * glint * smoothstep(0.35, 0.8, L) * 0.10 * uMotion;
  return col;
}

vec3 paintA(vec2 s) { return paint(tA, tA1, tA2, tA3, tAf1, tAf2, tAd, uCamA, uFxA, uLayA, uDetA, uLensA, s); }
vec3 paintB(vec2 s) { return paint(tB, tB1, tB2, tB3, tBf1, tBf2, tBd, uCamB, uFxB, uLayB, uDetB, uLensB, s); }

// one sheet of blown petals: each cell of a grid holds a turning petal that opens onto the new painting.
// A petal may reach over its neighbours, so the eight cells around are looked at too.
float petals(vec2 suv, float m, float scale, float seed, vec2 dir, out float rim) {
  vec2 g = suv * vec2(uAspect, 1.0) * scale + seed;
  vec2 cell = floor(g), fr0 = fract(g) - 0.5;
  float mask = 0.0; rim = 0.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 o = vec2(float(i), float(j));
      vec2 id = cell + o, fr = fr0 - o;
      float h1 = hash(id + seed), h2 = hash(id * 1.7 + 3.1 + seed);
      // where this cell sits along the wind decides when its petal opens
      float front = dot(((id + 0.5 - seed) / scale) / vec2(uAspect, 1.0) - 0.5, dir * vec2(uAspect, 1.0));
      float grow = clamp(m * 2.7 - (front + 0.95) * 0.75 - h1 * 0.5, 0.0, 1.0);
      if (grow <= 0.0) continue;
      vec2 r = rot(fr - (vec2(h1, h2) - 0.5) * 0.5, h2 * 6.2832 + m * 2.5);
      float d = length(vec2(r.x * 0.8, r.y * 1.5 + abs(r.x) * 0.25));
      float R = grow * 1.9;
      mask = max(mask, 1.0 - smoothstep(R - 0.05, R, d));
      rim = max(rim, exp(-abs(d - R) * 18.0));
    }
  }
  return mask;
}

void main() {
  vec2 suv = vUv;
  vec3 col;
  if (uMix <= 0.0) {
    col = paintA(suv);
  } else if (uMix >= 1.0) {
    col = paintB(suv);
  } else {
    float m = uMix;
    vec2 p = suv - uOrigin; p.x *= uAspect;
    float dist = length(p);
    float ang = atan(p.y, p.x);
    vec2 sa = suv, sb = suv;
    float mask = 0.0, edge = 0.0, bloom = 0.0, flood = 0.0;
    vec3 ecol = mix(uEdgeA, uEdgeB, m);
    if (uType > 5.5) {
      // the gentle film: one painting simply fades into the next
      mask = m;
    } else if (uType < 0.5 || (uType > 2.5 && uType < 3.5) || uType > 4.5) {
      // the portals. 0: a ragged ring of light opens from a point and the old painting winds around it.
      // 3: the same as a five-pointed star that turns as it opens. 5: a lantern's glow floods the frame
      // and settles into the daylight of the next painting.
      float n = texture2D(tNoise, vec2(ang * 0.55, dist * 1.3)).r * 0.6 + texture2D(tNoise, suv * 3.0).g * 0.4;
      float shape = dist, reach = 2.1, ragged = 0.2, feather = 0.035;
      if (uType > 2.5 && uType < 3.5) {
        float a5 = ang + m * 1.6 + 1.5708;
        shape = dist / (0.42 + 0.58 * (1.0 - pow(abs(sin(2.5 * a5)), 0.72)));
        reach = 2.15; ragged = 0.07;
      } else if (uType > 4.5) { feather = 0.22; ragged = 0.32; }
      float r = pow(m, 1.7) * reach * max(uAspect, 1.0);
      float e = shape - r + (n - 0.5) * ragged * (0.25 + m);
      mask = 1.0 - smoothstep(-feather, feather, e);
      edge = exp(-abs(e) * (uType > 4.5 ? 5.0 : 15.0));
      vec2 pr = rot(p, m * m * 2.0 * exp(-dist * 2.4)); pr.x /= uAspect;
      sa = uOrigin + pr;
      bloom = exp(-dist * dist * (7.0 - 5.0 * m)) * sin(3.14159 * m);
      if (uType > 4.5) flood = pow(sin(3.14159 * m), 1.4) * (0.55 + 0.45 * exp(-dist * 1.4));
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
      edge = exp(-abs(e) * 13.0) + 0.5 * exp(-max(0.0, -e) * 5.0) * step(e, 0.0) * (1.0 - m);
      // wet paint drags the picture under it a little way along the stroke
      sb = suv - vec2(dir.x / uAspect, dir.y) * 0.035 * exp(-max(0.0, -e) * 6.0) * step(e, 0.0);
    } else if (uType < 2.5) {
      // swirl: the old painting winds up like a spiral of sky and unwinds as the new one
      float fall = exp(-dist * 1.5);
      vec2 pa = rot(p, m * m * 3.4 * fall); pa.x /= uAspect; sa = uOrigin + pa;
      vec2 pb = rot(p, -(1.0 - m) * (1.0 - m) * 3.4 * fall); pb.x /= uAspect; sb = uOrigin + pb;
      float n = texture2D(tNoise, vec2(ang * 0.5 + dist * 1.6, dist * 0.7)).r;
      float e = dist * 0.6 + (n - 0.5) * 0.55 - (m * 1.75 - 0.3);
      mask = 1.0 - smoothstep(-0.07, 0.07, e);
      edge = exp(-abs(e) * 9.0) * 0.6;
      bloom = exp(-dist * dist * 5.0) * sin(3.14159 * m) * 0.5;
    } else {
      // petals: two sheets of blossom blow across in the wind
      vec2 dir = normalize(uDir);
      float r1, r2;
      float m1 = petals(suv, m, 5.0, 0.0, dir, r1);
      float m2 = petals(suv + 0.37, m, 8.5, 11.0, dir, r2);
      mask = max(m1, m2);
      edge = max(r1, r2) * (1.0 - mask * 0.6);
    }
    vec3 ca = mask < 1.0 ? paintA(sa) : vec3(0.0);
    vec3 cb = mask > 0.0 ? paintB(sb) : vec3(0.0);
    col = mix(ca, cb, mask);
    float lit = sin(3.14159 * m);
    col += ecol * edge * lit * 0.6;
    col += ecol * bloom * 0.7;
    col = mix(col, ecol * 1.08, flood * 0.72);
  }
  float l = lum(col);
  col = mix(vec3(l), col, uGrade.y);
  col *= uGrade.w;
  col *= mix(vec3(1.0), uWarm > 0.0 ? vec3(1.07, 1.0, 0.90) : vec3(0.92, 0.98, 1.08), abs(uWarm));
  col *= 1.0 - uGrade.x;
  vec2 v = vUv - 0.5;
  col *= 1.0 - uGrade.z * dot(v, v) * 1.5;
  col += (texture2D(tNoise, gl_FragCoord.xy / 64.0).b - 0.5) * 0.03;
  gl_FragColor = vec4(col, 1.0);
}
`;

/* A film clip: two neighbouring frames of a pre-rendered transition, blended, covering the screen. */
export const CLIP_FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D tF0, tF1;
uniform float uFrac, uAlpha;
uniform vec2 uFit;
void main() {
  vec2 uv = (vUv - 0.5) * uFit + 0.5;
  gl_FragColor = vec4(mix(texture2D(tF0, uv).rgb, texture2D(tF1, uv).rgb, uFrac), uAlpha);
}
`;

/* Things in the air: motes of light, embers, pollen, spray, and blossom petals. Screen-space points that
   drift with the scene and with the scroll. uShape 0 = a soft glowing mote, 1 = a turning petal. */
export const DUST_VERT = /* glsl */`
attribute vec4 seed;
uniform vec2 uOffset, uPar;
uniform float uSize, uPx, uTime, uSwirl, uShape;
varying float vA; varying float vK; varying float vR;
void main() {
  float sp = 0.45 + seed.w * 0.9;
  vec2 p = fract(seed.xy + uOffset * sp);
  p += vec2(sin(uTime * (0.3 + seed.z) + seed.w * 40.0), cos(uTime * (0.24 + seed.w) + seed.z * 31.0)) * 0.012 * uSwirl;
  p = (p * 2.0 - 1.0) * 1.08 + uPar * (0.4 + seed.z) * 3.0;
  gl_Position = vec4(p, 0.0, 1.0);
  gl_PointSize = uSize * uPx * (0.35 + seed.z * 1.1) * (1.0 + uShape * 0.9);
  vA = 0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * (0.8 + seed.w * 1.4) + seed.z * 50.0));
  vK = seed.w;
  vR = seed.z * 6.2832 + uTime * (0.5 + seed.w * 1.3) * (seed.z > 0.5 ? 1.0 : -1.0) + uOffset.x * 9.0 * (seed.w - 0.3);
}
`;
export const DUST_FRAG = /* glsl */`
precision highp float;
uniform vec3 uColA, uColB;
uniform float uAlpha, uShape;
varying float vA; varying float vK; varying float vR;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  // a mote: a soft disc, added to the picture like light
  float mote = smoothstep(0.25, 0.02, dot(c, c));
  // a petal: a narrow leaf that turns, laid over the picture like paint
  float cs = cos(vR), sn = sin(vR);
  vec2 r = vec2(cs * c.x - sn * c.y, sn * c.x + cs * c.y);
  float d = length(vec2(r.x * 1.15 + 0.08, r.y * (2.2 + r.x * 1.6)));
  float petal = smoothstep(0.42, 0.34, d);
  float shade = 0.82 + 0.3 * smoothstep(-0.2, 0.2, r.y);
  float a = mix(mote * vA, petal * (0.55 + 0.45 * vA), uShape) * uAlpha;
  vec3 col = mix(uColA, uColB, vK) * mix(1.0, shade, uShape);
  // premultiplied: with alpha 0 the colour is added (light), with alpha a it covers (paint)
  gl_FragColor = vec4(col * a, a * uShape);
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
