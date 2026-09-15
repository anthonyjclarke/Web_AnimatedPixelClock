import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { snakeDefaults, type SnakeSettings } from './snake';
export function SnakeControls({
  value,
  onChange,
}: {
  value: SnakeSettings;
  onChange: (v: SnakeSettings) => void;
}) {
  return (
    <section className="tetris-settings">
      <h2>Snake settings</h2>
      <p className="audio-note">
        Snake follows food around the digits. At a minute change it eats each
        changed digit’s pellets, then moves clear before the new digit appears.
      </p>
      {(['snakeSpeed', 'snakeLength'] as const).map((key, i) => (
        <div key={key}>
          <div className="brightness">
            <label id={key + '-label'}>{i ? 'Starting length' : 'Speed'}</label>
            <output>{i ? value[key] : (value[key] / 10).toFixed(1)}</output>
          </div>
          <Slider
            aria-labelledby={key + '-label'}
            min={i ? 4 : 5}
            max={i ? 12 : 30}
            step={1}
            value={[value[key]]}
            onValueChange={(n) =>
              onChange({ ...value, [key]: Array.isArray(n) ? n[0] : n })
            }
          />
        </div>
      ))}
      {(['snakeWallBorder', 'snakeShowDate'] as const).map((key, i) => (
        <div className="setting-row" key={key}>
          <label htmlFor={key}>{i ? 'Show Snake date' : 'Arena border'}</label>
          <Switch
            id={key}
            checked={value[key]}
            onCheckedChange={(v) => onChange({ ...value, [key]: v })}
          />
        </div>
      ))}
      <button className="quiet" onClick={() => onChange({ ...snakeDefaults })}>
        Reset Snake settings
      </button>
    </section>
  );
}
