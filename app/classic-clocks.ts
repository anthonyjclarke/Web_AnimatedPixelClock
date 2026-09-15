import { classicFont } from './gfx-font';
import type { Framebuffer } from './framebuffer';
export const dateFormats = [
  'DD/MM/YYYY',
  'MM/DD/YYYY',
  'YYYY-MM-DD',
  'DD.MM.YYYY',
];
export const normalizeDateFormat = (value: unknown): number =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value >= 0 &&
  value <= 3
    ? value
    : 0;
export function calendarParts(date: Date, zone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone === 'local' ? undefined : zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'long',
  }).formatToParts(date);
  const get = (key: string) => parts.find((p) => p.type === key)!.value;
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    weekday: get('weekday'),
  };
}
export function classicDate(date: Date, zone: string, format: number) {
  const { year, month, day } = calendarParts(date, zone);
  return [
    `${day}/${month}/${year}`,
    `${month}/${day}/${year}`,
    `${year}-${month}-${day}`,
    `${day}.${month}.${year}`,
  ][normalizeDateFormat(format)];
}
export function drawGfxText(
  frame: Framebuffer,
  text: string,
  x: number,
  y: number,
  size: number,
  color: string,
) {
  [...text].forEach((ch, i) =>
    classicFont[ch]?.forEach((bits, col) => {
      for (let row = 0; row < 8; row++)
        if (bits & (1 << row))
          frame.rect(
            x + (i * 6 + col) * size,
            y + row * size,
            size,
            size,
            color,
          );
    }),
  );
}
// Layout from src/clocks/clock_common.cpp: displayStandardClock/displayLargeClock.
export function drawClassicClock(
  frame: Framebuffer,
  large: boolean,
  time: string,
  pm: boolean,
  date: Date,
  o: {
    zone: string;
    hour24: boolean;
    date: boolean;
    blink: boolean;
    color: string;
    dateFormat?: number;
  },
) {
  frame.clear('#000000');
  const colon = !o.blink || date.getMilliseconds() < 500;
  drawGfxText(
    frame,
    time.replace(':', colon ? ':' : ' '),
    large ? 4 : 19,
    large ? 4 : 8,
    large ? 4 : 3,
    o.color,
  );
  if (!o.hour24)
    drawGfxText(frame, pm ? 'PM' : 'AM', 110, large ? 54 : 8, 1, '#ffffff');
  if (o.date) {
    drawGfxText(
      frame,
      classicDate(date, o.zone, o.dateFormat ?? 0),
      34,
      large ? 54 : 38,
      1,
      '#ffffff',
    );
    if (!large) {
      const day = calendarParts(date, o.zone).weekday;
      drawGfxText(
        frame,
        day,
        Math.trunc((128 - day.length * 6) / 2),
        52,
        1,
        '#ffffff',
      );
    }
  }
}
