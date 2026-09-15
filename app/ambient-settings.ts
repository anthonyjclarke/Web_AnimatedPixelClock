export const ambientStyles = {
  0: 'Space Invaders battle',
  1: 'Pac-Man maze',
  3: 'Starfield',
  4: 'Aquarium',
  5: 'This Is Fine',
  6: 'Custom animation',
} as const;
export type AmbientStyle = keyof typeof ambientStyles;
export type AmbientSettings = {
  enabled: boolean;
  style: AmbientStyle;
  startHour: number;
  endHour: number;
  showClock: boolean;
};
export const ambientDefaults: AmbientSettings = {
  enabled: false,
  style: 0,
  startHour: 20,
  endHour: 23,
  showClock: true,
};
const bounded = (v: unknown, fallback: number, min: number, max: number) =>
  typeof v === 'number' && Number.isFinite(v)
    ? Math.max(min, Math.min(max, Math.round(v)))
    : fallback;
export const normalizeCycleSeconds = (v: unknown) => bounded(v, 20, 5, 3600);
export function normalizeAmbient(value: unknown): AmbientSettings {
  const v = (
    value && typeof value === 'object' ? value : {}
  ) as Partial<AmbientSettings>;
  return {
    enabled: v.enabled === true,
    style:
      typeof v.style === 'number' && v.style in ambientStyles ? v.style : 0,
    startHour: bounded(v.startHour, 20, 0, 23),
    endHour: bounded(v.endHour, 23, 0, 23),
    showClock: typeof v.showClock === 'boolean' ? v.showClock : true,
  };
}
export function scheduledAmbient(settings: AmbientSettings, hour: number) {
  const { enabled, startHour: s, endHour: e } = settings;
  return (
    enabled &&
    Number.isFinite(hour) &&
    s !== e &&
    (s < e ? hour >= s && hour < e : hour >= s || hour < e)
  );
}
export function ambientHour(date: Date, zone: string) {
  return Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: zone === 'local' ? undefined : zone,
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(date),
  );
}
