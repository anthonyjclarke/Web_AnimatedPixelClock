import { Framebuffer, FramePresenter } from './framebuffer';
import { createPainter } from './drawing';
import { drawPacmanSprite } from './character-clocks';
import { drawSpaceSprite } from './space';
import { drawGfxText } from './classic-clocks';
import { createEffect as invaders } from './ambient-native/invaders.js';
import { createEffect as pacman } from './ambient-native/pacman_chase.js';
import { createEffect as stars } from './ambient-native/stars.js';
import { createEffect as aquarium } from './ambient-native/aquarium.js';
import type { AmbientStyle } from './ambient-settings';
export function color565(c: number) {
  const r = (c >> 11) & 31,
    g = (c >> 5) & 63,
    b = c & 31;
  return (
    (((r << 3) | (r >> 2)) << 16) |
    (((g << 2) | (g >> 4)) << 8) |
    ((b << 3) | (b >> 2))
  );
}
const hex = (c: number) => '#' + color565(c).toString(16).padStart(6, '0');
export type PcaAnimation = {
  palette: Uint32Array;
  delays: number[];
  frames: Uint8Array;
  duration: number;
};
export function parsePca(buffer: ArrayBuffer): PcaAnimation {
  const bytes = new Uint8Array(buffer),
    v = new DataView(buffer);
  if (bytes.length < 12 || String.fromCharCode(...bytes.slice(0, 4)) !== 'PCA1')
    throw Error('Choose a PCA1 animation (.pca).');
  const count = v.getUint16(4, true),
    defaultMs = v.getUint16(6, true),
    colors = bytes[8],
    offset = 12 + colors * 2 + count * 2;
  if (
    count < 1 ||
    count > 360 ||
    colors < 2 ||
    colors > 16 ||
    defaultMs < 20 ||
    defaultMs > 5000 ||
    bytes.length !== offset + count * 4096
  )
    throw Error('Invalid PCA dimensions, frame count, palette or file length.');
  const palette = Uint32Array.from({ length: colors }, (_, i) =>
    color565(v.getUint16(12 + i * 2, true)),
  );
  const delays = Array.from({ length: count }, (_, i) =>
    Math.max(34, Math.min(5000, v.getUint16(12 + colors * 2 + i * 2, true))),
  );
  const frames = bytes.slice(offset);
  for (const b of frames)
    if (b >> 4 >= colors || (b & 15) >= colors)
      throw Error('Animation references a missing palette color.');
  return {
    palette,
    delays,
    frames,
    duration: delays.reduce((a, b) => a + b, 0),
  };
}
export function drawPca(
  frame: Framebuffer,
  animation: PcaAnimation,
  ms: number,
) {
  let t = Math.max(0, ms) % animation.duration,
    index = 0;
  while (index < animation.delays.length - 1 && t >= animation.delays[index])
    t -= animation.delays[index++];
  for (let i = 0; i < 8192; i++) {
    const b = animation.frames[index * 4096 + (i >> 1)];
    frame.pixels[i] = animation.palette[i & 1 ? b & 15 : b >> 4];
  }
}
/** One isolated native state per canvas/effect. Simulation capped to 30 Hz; the
 * complete framebuffer is presented once, including the optional corner clock. */
export class AmbientRenderer {
  readonly frame = new Framebuffer();
  private presenter: FramePresenter | null = null;
  private effect: (() => void) | null = null;
  private style: AmbientStyle | null = null;
  private now = 0;
  private previous: number | null = null;
  private remainder = 0;
  private random: () => number;
  constructor(random: () => number = Math.random) {
    this.random = random;
  }
  reset() {
    this.style = null;
    this.previous = null;
    this.remainder = 0;
    this.now = 0;
  }
  private setup(style: AmbientStyle) {
    this.style = style;
    this.now = 0;
    this.remainder = 0;
    const f = this.frame,
      p = createPainter((x, y, w, h, c) => f.rect(x, y, w, h, c));
    const rect = (x: number, y: number, w: number, h: number, c: number) =>
      f.rect(
        Math.trunc(x),
        Math.trunc(y),
        Math.trunc(w),
        Math.trunc(h),
        hex(c),
      );
    const display = {
      drawPixel: (x: number, y: number, c: number) => rect(x, y, 1, 1, c),
      fillRect: rect,
      drawFastHLine: (x: number, y: number, w: number, c: number) =>
        rect(x, y, w, 1, c),
      drawRect: (x: number, y: number, w: number, h: number, c: number) => {
        rect(x, y, w, 1, c);
        rect(x, y + h - 1, w, 1, c);
        rect(x, y, 1, h, c);
        rect(x + w - 1, y, 1, h, c);
      },
      fillCircle: (x: number, y: number, r: number, c: number) =>
        p.circle(x, y, r, hex(c)),
      fillTriangle: (
        x: number,
        y: number,
        xx: number,
        yy: number,
        xxx: number,
        yyy: number,
        c: number,
      ) => p.triangle([x, y], [xx, yy], [xxx, yyy], hex(c)),
    };
    const env = {
      display,
      millis: () => Math.floor(this.now),
      random: (a: number, b?: number) =>
        b === undefined
          ? Math.floor(this.random() * a)
          : a + Math.floor(this.random() * (b - a)),
      drawSpaceCharacter: (x: number, y: number, phase: number, type: number) =>
        drawSpaceSprite(f, x, y, phase, type),
      drawPacman: (x: number, y: number, direction: number, mouth: number) =>
        drawPacmanSprite({ x, y, direction, mouth }, (xx, yy, w, h, c) =>
          f.rect(xx, yy, w, h, c === '#030608' ? '#000000' : c),
        ),
    };
    this.effect = {
      0: invaders,
      1: pacman,
      3: stars,
      4: aquarium,
      5: invaders,
      6: invaders,
    }[style](env);
  }
  render(
    seconds: number,
    style: AmbientStyle,
    animation: PcaAnimation | null = null,
  ) {
    const changed = this.style !== style;
    if (changed) this.setup(style);
    const delta =
      this.previous === null || changed
        ? 0
        : Math.min(0.1, Math.max(0, seconds - this.previous));
    this.previous = seconds;
    this.remainder += delta * 1000;
    let draw = changed;
    while (this.remainder + 1e-7 >= 1000 / 30) {
      this.now += 1000 / 30;
      this.remainder = Math.max(0, this.remainder - 1000 / 30);
      this.frame.clear('#000000');
      this.effect?.();
      draw = true;
    }
    if (changed) {
      this.frame.clear('#000000');
      this.effect?.();
    }
    if (animation && (style === 5 || style === 6)) {
      drawPca(this.frame, animation, this.now);
      draw = true;
    }
    return draw;
  }
  present(
    canvas: HTMLCanvasElement,
    date: Date,
    zone: string,
    hour24: boolean,
    blink: boolean,
    showClock: boolean,
  ) {
    // Use a copy: removing the overlay cannot leave a stale clock in the effect.
    const output = new Framebuffer();
    output.pixels.set(this.frame.pixels);
    if (showClock) {
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: zone === 'local' ? undefined : zone,
        hourCycle: 'h23',
        hour: '2-digit',
        minute: '2-digit',
      }).formatToParts(date);
      let h = Number(parts.find((p) => p.type === 'hour')!.value);
      if (!hour24) h = h % 12 || 12;
      const minute = parts.find((p) => p.type === 'minute')!.value;
      output.rect(94, 0, 34, 10, '#000000');
      drawGfxText(
        output,
        `${String(h).padStart(2, '0')}${!blink || date.getSeconds() % 2 === 0 ? ':' : ' '}${minute}`,
        97,
        1,
        1,
        '#ffffff',
      );
    }
    this.presenter ??= new FramePresenter();
    this.presenter.present(canvas, output);
  }
}
