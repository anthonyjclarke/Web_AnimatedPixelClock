import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { pongDefaults, pongRanges, type PongSettings } from './pong';
export function PongControls({
  value,
  onChange,
}: {
  value: PongSettings;
  onChange: (v: PongSettings) => void;
}) {
  return (
    <section className="tetris-settings">
      <h2>Pong settings</h2>
      <p className="audio-note">
        The paddle tracks the ball as it knocks the digits. Changed digits break
        and reassemble.
      </p>
      {(Object.keys(pongRanges) as (keyof typeof pongRanges)[]).map(
        (key, i) => {
          const [min, max, step] = pongRanges[key];
          return (
            <div key={key}>
              <div className="brightness">
                <label id={key + '-label'}>
                  {
                    [
                      'Ball speed',
                      'Bounce strength',
                      'Bounce damping',
                      'Paddle width',
                    ][i]
                  }
                </label>
                <output>
                  {i === 1
                    ? (value[key] / 10).toFixed(1)
                    : i === 2
                      ? (value[key] / 100).toFixed(2)
                      : value[key]}
                </output>
              </div>
              <Slider
                aria-labelledby={key + '-label'}
                min={min}
                max={max}
                step={step}
                value={[value[key]]}
                onValueChange={(n) =>
                  onChange({ ...value, [key]: Array.isArray(n) ? n[0] : n })
                }
              />
            </div>
          );
        },
      )}
      {(['pongHorizontalBounce', 'pongDigitShatter'] as const).map((key, i) => (
        <div className="setting-row" key={key}>
          <label htmlFor={key}>
            {i ? 'Digit shatter / reassemble' : 'Horizontal digit bounce'}
          </label>
          <Switch
            id={key}
            checked={value[key]}
            onCheckedChange={(v) => onChange({ ...value, [key]: v })}
          />
        </div>
      ))}
      <button className="quiet" onClick={() => onChange({ ...pongDefaults })}>
        Reset Pong settings
      </button>
    </section>
  );
}
