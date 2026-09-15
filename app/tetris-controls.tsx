import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { tetrisDefaults, type TetrisSettings } from './tetris-settings';
export function TetrisControls({
  value,
  onChange,
}: {
  value: TetrisSettings;
  onChange: (value: TetrisSettings) => void;
}) {
  const set = (key: keyof TetrisSettings, v: number | boolean) =>
    onChange({ ...value, [key]: v });
  const selects: [keyof TetrisSettings, string, string[]][] = [
    ['tetrisBlockStyle', 'Block style', ['LCD grid (gaps)', 'Solid blocks']],
    ['tetrisAnimStyle', 'Change animation', ['Drop-in slabs', 'Falling dots']],
    ['tetrisDotOrder', 'Dot build order', ['Bottom-up', 'Random']],
    ['tetrisDatePosition', 'Date position', ['Top', 'Bottom']],
    ['tetrisSmallClockPos', 'Small clock corner', ['Top-left', 'Top-right']],
  ];
  const toggles: [keyof TetrisSettings, string][] = [
    ['tetrisIdleTumble', 'Block game'],
    ['tetrisSmallClock', 'Small corner clock'],
    ['tetrisSmoothGame', 'Smooth play'],
    ['tetrisShowDate', 'Show Tetris date'],
    ['tetrisDigitBounce', 'Digit bounce'],
  ];
  return (
    <section className="tetris-settings">
      <h2>Tetris settings</h2>
      <p className="audio-note">
        Block game hides the date. Small corner clock enables the game and gives
        it a taller playing area.
      </p>
      {toggles.map(([key, label]) => (
        <div className="setting-row" key={key}>
          <label htmlFor={key}>{label}</label>
          <Switch
            id={key}
            checked={Boolean(value[key])}
            onCheckedChange={(v) => set(key, v)}
          />
        </div>
      ))}
      {selects.map(([key, label, choices]) => (
        <div key={key}>
          <label className="zone-label" id={key + '-label'}>
            {label}
          </label>
          <Select
            value={String(value[key])}
            onValueChange={(v) => v !== null && set(key, Number(v))}
          >
            <SelectTrigger
              className="zone-select"
              aria-labelledby={key + '-label'}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {choices.map((label, i) => (
                <SelectItem key={i} value={String(i)}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
      {(['tetrisFallSpeed', 'tetrisDotSpeed'] as const).map((key, i) => (
        <div key={key}>
          <div className="brightness">
            <label id={key + '-label'}>
              {i ? 'Dot fall speed' : 'Slab / block fall speed'}
            </label>
            <output>{(value[key] / 10).toFixed(1)}</output>
          </div>
          <Slider
            aria-labelledby={key + '-label'}
            min={5}
            max={30}
            step={1}
            value={[value[key]]}
            onValueChange={(v) => set(key, Array.isArray(v) ? v[0] : v)}
          />
        </div>
      ))}
      <button className="quiet" onClick={() => onChange({ ...tetrisDefaults })}>
        Reset Tetris settings
      </button>
    </section>
  );
}
