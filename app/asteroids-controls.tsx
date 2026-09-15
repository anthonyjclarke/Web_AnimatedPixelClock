import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  asteroidsDefaults,
  asteroidsRanges,
  type AsteroidsSettings,
} from './asteroids';
export function AsteroidsControls({
  value,
  onChange,
}: {
  value: AsteroidsSettings;
  onChange: (value: AsteroidsSettings) => void;
}) {
  return (
    <section className="tetris-settings">
      <h2>Asteroids settings</h2>
      <p className="audio-note">
        The ship drifts, splits rocks and shoots changed digits. Rock speed
        applies to newly spawned rocks; split rocks can exceed the starting
        count.
      </p>
      {(
        [
          'asteroidsShipSpeed',
          'asteroidsRockSpeed',
          'asteroidsRockCount',
        ] as const
      ).map((key, i) => (
        <div key={key}>
          <div className="brightness">
            <label id={key + '-label'}>
              {['Ship speed', 'Rock speed', 'Starting rock count'][i]}
            </label>
            <output>
              {i === 2 ? value[key] : (value[key] / 10).toFixed(1)}
            </output>
          </div>
          <Slider
            aria-labelledby={key + '-label'}
            min={asteroidsRanges[key][0]}
            max={asteroidsRanges[key][1]}
            step={1}
            value={[value[key]]}
            onValueChange={(n) =>
              onChange({ ...value, [key]: Array.isArray(n) ? n[0] : n })
            }
          />
        </div>
      ))}
      {(['asteroidsShowDate', 'asteroidsTransparent'] as const).map(
        (key, i) => (
          <div className="setting-row" key={key}>
            <label htmlFor={key}>
              {i ? 'Transparent digits' : 'Show Asteroids date'}
            </label>
            <Switch
              id={key}
              checked={value[key]}
              onCheckedChange={(v) => onChange({ ...value, [key]: v })}
            />
          </div>
        ),
      )}
      <button
        className="quiet"
        onClick={() => onChange({ ...asteroidsDefaults })}
      >
        Reset Asteroids settings
      </button>
    </section>
  );
}
