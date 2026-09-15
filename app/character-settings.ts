export const marioDefaults = {
  marioBounceHeight: 35,
  marioBounceSpeed: 6,
  marioSmoothAnimation: false,
  marioWalkSpeed: 20,
  marioIdleEncounters: false,
  marioEncounterFreq: 1,
  marioEncounterSpeed: 1,
};
export const pacmanDefaults = {
  pacmanSpeed: 10,
  pacmanEatingSpeed: 20,
  pacmanMouthSpeed: 10,
  pacmanPelletCount: 8,
  pacmanPelletRandomSpacing: true,
  pacmanBounceEnabled: true,
  pacmanGhostChase: false,
};
export type MarioSettings = typeof marioDefaults;
export type PacmanSettings = typeof pacmanDefaults;
export const characterRanges: Record<string, [number, number, number]> = {
  marioBounceHeight: [10, 50, 5],
  marioBounceSpeed: [2, 15, 1],
  marioWalkSpeed: [15, 35, 1],
  marioEncounterFreq: [0, 3, 1],
  marioEncounterSpeed: [0, 2, 1],
  pacmanSpeed: [5, 30, 1],
  pacmanEatingSpeed: [10, 50, 1],
  pacmanMouthSpeed: [5, 20, 1],
  pacmanPelletCount: [0, 20, 1],
};
function normalize<T extends Record<string, number | boolean>>(
  defaults: T,
  value: unknown,
): T {
  const result = { ...defaults },
    v =
      value && typeof value === 'object'
        ? (value as Record<string, unknown>)
        : {};
  for (const key of Object.keys(defaults)) {
    const n = v[key];
    if (typeof defaults[key] === 'boolean') {
      if (typeof n === 'boolean') (result as Record<string, unknown>)[key] = n;
    } else if (typeof n === 'number' && Number.isFinite(n)) {
      const [min, max, step] = characterRanges[key];
      (result as Record<string, unknown>)[key] = Math.max(
        min,
        Math.min(max, min + Math.round((n - min) / step) * step),
      );
    }
  }
  return result;
}
export const normalizeMario = (v: unknown) => normalize(marioDefaults, v);
export const normalizePacman = (v: unknown) => normalize(pacmanDefaults, v);
