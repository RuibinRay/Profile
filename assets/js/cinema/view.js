/*
 * view.js — the camera maths shared by both stages (WebGL and the lighter CSS one), so a point of a
 * painting lands on the same pixel whichever stage is drawing it.
 */
import { PAINTINGS } from './manifest.js';

/** The share of the painting's height that fills the screen at zoom 1 ("cover"). */
export function fitOf(aspect, ia) { return aspect > ia ? ia / aspect : 1; }

/** Keep the camera inside the painting where it can; a view wider than the painting stays centred. */
export function clampCam(cam, ia, aspect) {
  const fit = fitOf(aspect, ia);
  const hx = 0.5 * aspect / ia * fit / cam.z, hy = 0.5 * fit / cam.z;
  cam.x = hx >= 0.5 ? 0.5 : Math.min(1 - hx, Math.max(hx, cam.x));
  cam.y = hy >= 0.5 ? 0.5 : Math.min(1 - hy, Math.max(hy, cam.y));
  return cam;
}

/** Where a point of the painting (0–1 across, 0–1 down) falls on a W × H screen, in pixels. */
export function toScreen(cam, ia, W, H, pt) {
  const aspect = W / H, fit = fitOf(aspect, ia);
  let px = (pt[0] - cam.x) * cam.z / fit * ia, py = -(pt[1] - cam.y) * cam.z / fit;
  if (cam.r) { const c = Math.cos(-cam.r), s = Math.sin(-cam.r); const x = c * px - s * py; py = s * px + c * py; px = x; }
  return { x: (px / aspect + 0.5) * W, y: (0.5 - py) * H };
}

export function anchorOf(paintingId, name) {
  const p = PAINTINGS[paintingId];
  return (p && p.anchors[name]) || [0.5, 0.5];
}

export const ease = {
  smooth: (t) => t * t * (3 - 2 * t),
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t) => 1 - Math.pow(1 - t, 3),
  clamp: (t) => Math.min(1, Math.max(0, t))
};
export const lerp = (a, b, t) => a + (b - a) * t;
/** 0 before a, 1 after b, linear between. */
export const span = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)));
