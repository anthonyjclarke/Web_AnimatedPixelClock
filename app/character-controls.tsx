import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  marioDefaults,
  pacmanDefaults,
  characterRanges,
} from './character-settings';
const labels: Record<string, string> = {
  marioBounceHeight: 'Digit bounce height',
  marioBounceSpeed: 'Digit fall speed',
  marioWalkSpeed: 'Walk speed',
  marioSmoothAnimation: 'Smooth four-frame walk',
  marioIdleEncounters: 'Idle encounters',
  marioEncounterFreq: 'Encounter frequency',
  marioEncounterSpeed: 'Encounter speed',
  pacmanSpeed: 'Patrol speed',
  pacmanEatingSpeed: 'Eating speed',
  pacmanMouthSpeed: 'Mouth frame interval',
  pacmanPelletCount: 'Patrol pellets',
  pacmanPelletRandomSpacing: 'Randomize pellet spacing',
  pacmanBounceEnabled: 'Digit bounce',
  pacmanGhostChase: 'Random ghost chase · Web extra',
};
const choices: Record<string, string[]> = {
  marioEncounterFreq: [
    'Rare · 25–35 seconds',
    'Normal · 15–25 seconds',
    'Frequent · 8–15 seconds',
    'Chaotic · 2–5 seconds',
  ],
  marioEncounterSpeed: ['Slow', 'Normal', 'Fast'],
};
export function CharacterControls({
  kind,
  value,
  onChange,
}: {
  kind: 'Mario' | 'Pac-Man';
  value: Record<string, number | boolean>;
  onChange: (v: Record<string, number | boolean>) => void;
}) {
  const defaults = kind === 'Mario' ? marioDefaults : pacmanDefaults;
  return (
    <section className="tetris-settings">
      <h2>{kind} settings</h2>
      <p className="audio-note">
        {kind === 'Mario'
          ? 'Idle encounters include enemies, coins and power-ups. Minute changes take priority.'
          : 'Pellets are eaten and regenerated during patrol. A shorter mouth interval animates faster.'}
      </p>
      {Object.keys(defaults).map((key) => {
        const v = value[key],
          set = (n: number | boolean) => onChange({ ...value, [key]: n });
        if (typeof v === 'boolean')
          return (
            <div className="setting-row" key={key}>
              <label htmlFor={key}>{labels[key]}</label>
              <Switch id={key} checked={v} onCheckedChange={set} />
            </div>
          );
        if (choices[key])
          return (
            <div key={key}>
              <label className="zone-label" id={key + '-label'}>
                {labels[key]}
              </label>
              <Select
                value={String(v)}
                onValueChange={(n) => n !== null && set(Number(n))}
              >
                <SelectTrigger
                  className="zone-select"
                  aria-labelledby={key + '-label'}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {choices[key].map((label, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        const [min, max, step] = characterRanges[key];
        return (
          <div key={key}>
            <div className="brightness">
              <label id={key + '-label'}>{labels[key]}</label>
              <output>
                {key === 'pacmanPelletCount'
                  ? v
                  : key === 'pacmanMouthSpeed'
                    ? `${v * 10} ms`
                    : (v / 10).toFixed(1)}
              </output>
            </div>
            <Slider
              aria-labelledby={key + '-label'}
              min={min}
              max={max}
              step={step}
              value={[v]}
              onValueChange={(n) => set(Array.isArray(n) ? n[0] : n)}
            />
          </div>
        );
      })}
      {kind === 'Pac-Man' && <p className="audio-note">Web extra: occasional ghost chases cross the bottom of the screen. Off by default; digit changes take priority.</p>}
      <button className="quiet" onClick={() => onChange({ ...defaults })}>
        Reset {kind} settings
      </button>
    </section>
  );
}
