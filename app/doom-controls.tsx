import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { doomDefaults, type DoomSettings } from './doom';
const winds = { '0': 'Left (classic)', '1': 'Neutral', '2': 'Right' };
export function DoomControls({
  value,
  onChange,
}: {
  value: DoomSettings;
  onChange: (v: DoomSettings) => void;
}) {
  return (
    <section className="tetris-settings">
      <h2>Doom Fire settings</h2>
      {(['doomFlameHeight', 'doomGroundHeight'] as const).map((key, i) => (
        <div key={key}>
          <div className="brightness">
            <label id={key}>
              {i ? 'Ground flame height' : 'Digit flame height'}
            </label>
            <output>{value[key]} px</output>
          </div>
          <Slider
            aria-labelledby={key}
            min={i ? 5 : 8}
            max={40}
            step={1}
            value={[value[key]]}
            onValueChange={(n) =>
              onChange({ ...value, [key]: Array.isArray(n) ? n[0] : n })
            }
          />
        </div>
      ))}
      <label id="doom-wind" className="zone-label">
        Wind
      </label>
      <Select
        items={winds}
        value={String(value.doomWind)}
        onValueChange={(v) =>
          v !== null && onChange({ ...value, doomWind: Number(v) })
        }
      >
        <SelectTrigger aria-labelledby="doom-wind" className="zone-select">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(winds).map(([id, label]) => (
            <SelectItem key={id} value={id}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {(['doomBurningDigits', 'doomSmoothFire', 'doomShowDate'] as const).map(
        (key, i) => (
          <div className="setting-row" key={key}>
            <label htmlFor={key}>
              {['Burning digits', 'Smooth digit flames', 'Show Doom date'][i]}
            </label>
            <Switch
              id={key}
              checked={value[key]}
              onCheckedChange={(v) => onChange({ ...value, [key]: v })}
            />
          </div>
        ),
      )}
      {(['ember', 'flame', 'core'] as const).map((key) => (
        <div className="setting-row" key={key}>
          <label htmlFor={'doom-' + key}>
            {key[0].toUpperCase() + key.slice(1)} color
          </label>
          <input
            id={'doom-' + key}
            type="color"
            value={value[key]}
            onChange={(e) => onChange({ ...value, [key]: e.target.value })}
          />
        </div>
      ))}
      <button className="quiet" onClick={() => onChange({ ...doomDefaults })}>
        Reset Doom settings
      </button>
    </section>
  );
}
