export const tetrisDefaults = {
  tetrisFallSpeed: 12,
  tetrisBlockStyle: 0,
  tetrisIdleTumble: true,
  tetrisAnimStyle: 1,
  tetrisShowDate: true,
  tetrisDatePosition: 1,
  tetrisDotSpeed: 12,
  tetrisDotOrder: 0,
  tetrisDigitBounce: true,
  tetrisSmoothGame: false,
  tetrisSmallClock: false,
  tetrisSmallClockPos: 1,
};
export type TetrisSettings = typeof tetrisDefaults;
export function normalizeTetris(value: unknown): TetrisSettings {
  const input =
    value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : {};
  const result = { ...tetrisDefaults };
  for (const key of Object.keys(result) as (keyof TetrisSettings)[]) {
    const v = input[key],
      def = result[key];
    if (typeof def === 'boolean') {
      if (typeof v === 'boolean') (result as Record<string, unknown>)[key] = v;
    } else if (typeof v === 'number' && Number.isFinite(v)) {
      const speed = key === 'tetrisFallSpeed' || key === 'tetrisDotSpeed';
      (result as Record<string, unknown>)[key] = Math.max(
        speed ? 5 : 0,
        Math.min(speed ? 30 : 1, Math.round(v)),
      );
    }
  }
  return result;
}
