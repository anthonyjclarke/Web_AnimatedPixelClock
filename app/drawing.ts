// Shared native-pixel drawing. Triangle scan conversion follows Adafruit GFX.
export type Paint=(x:number,y:number,w:number,h:number,color:string)=>void;
export function createPainter(paint: Paint) {
  const pixel = (x: number, y: number, col: string) =>
    paint(Math.trunc(x), Math.trunc(y), 1, 1, col);
  const circle = (x: number, y: number, r: number, col: string) => {
    x = Math.trunc(x);
    y = Math.trunc(y);
    for (let yy = -r; yy <= r; yy++)
      for (let xx = -r; xx <= r; xx++)
        if (xx * xx + yy * yy <= r * r + r / 2) pixel(x + xx, y + yy, col);
  };
  // Match Adafruit GFX scanline filling, including integer truncation.
  // Edge-function rasterization omitted pixels from several mouth frames.
  const triangle = (a: number[], b: number[], c: number[], col: string) => {
    const points = [a, b, c]
      .map((p) => p.map(Math.trunc))
      .sort((p, q) => p[1] - q[1]);
    const [[x0, y0], [x1, y1], [x2, y2]] = points;
    const span = (a: number, b: number, y: number) => {
      if (a > b) [a, b] = [b, a];
      for (let x = a; x <= b; x++) pixel(x, y, col);
    };
    if (y0 === y2) {
      span(Math.min(x0, x1, x2), Math.max(x0, x1, x2), y0);
      return;
    }
    const dx01 = x1 - x0,
      dy01 = y1 - y0,
      dx02 = x2 - x0,
      dy02 = y2 - y0,
      dx12 = x2 - x1,
      dy12 = y2 - y1;
    let sa = 0,
      sb = 0,
      y = y0;
    const last = y1 === y2 ? y1 : y1 - 1;
    for (; y <= last; y++) {
      span(x0 + Math.trunc(sa / dy01), x0 + Math.trunc(sb / dy02), y);
      sa += dx01;
      sb += dx02;
    }
    sa = dx12 * (y - y1);
    sb = dx02 * (y - y0);
    for (; y <= y2; y++) {
      span(x1 + Math.trunc(sa / dy12), x0 + Math.trunc(sb / dy02), y);
      sa += dx12;
      sb += dx02;
    }
  };
  return { pixel, circle, triangle };
}
