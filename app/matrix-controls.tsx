import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { matrixDefaults, type MatrixSettings } from './matrix';
const fontSizes = { '3': 'Small (3 × 5)', '5': 'Original (5 × 7)' };
const densities = { '0': 'Sparse', '1': 'Normal', '2': 'Dense' };
export function MatrixControls({
  value,
  onChange,
}: {
  value: MatrixSettings;
  onChange: (value: MatrixSettings) => void;
}) {
  return (
    <section className="tetris-settings">
      <h2>Matrix Rain settings</h2>
      <p className="audio-note">
        Changed digits decode through random glyphs while nearby rain
        accelerates. Speed applies to new columns; density controls their
        respawn delay.
      </p>
      <label className="zone-label" id="matrix-font-label">
        Rain font size
      </label>
      <Select
        items={fontSizes}
        value={String(value.matrixRainFontSize)}
        onValueChange={(n) =>
          n !== null && onChange({ ...value, matrixRainFontSize: Number(n) })
        }
      >
        <SelectTrigger
          className="zone-select"
          aria-labelledby="matrix-font-label"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(fontSizes).map(([id, label]) => (
            <SelectItem key={id} value={id}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="brightness">
        <label id="matrix-speed-label">Rain speed</label>
        <output>{(value.matrixRainSpeed / 10).toFixed(1)}</output>
      </div>
      <Slider
        aria-labelledby="matrix-speed-label"
        min={5}
        max={30}
        step={1}
        value={[value.matrixRainSpeed]}
        onValueChange={(n) =>
          onChange({ ...value, matrixRainSpeed: Array.isArray(n) ? n[0] : n })
        }
      />
      <label className="zone-label" id="matrix-density-label">
        Rain density
      </label>
      <Select
        items={densities}
        value={String(value.matrixRainDensity)}
        onValueChange={(n) =>
          n !== null && onChange({ ...value, matrixRainDensity: Number(n) })
        }
      >
        <SelectTrigger
          className="zone-select"
          aria-labelledby="matrix-density-label"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(densities).map(([id, label]) => (
            <SelectItem key={id} value={id}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {(['matrixShowDate', 'matrixTransparent'] as const).map((key, i) => (
        <div className="setting-row" key={key}>
          <label htmlFor={key}>
            {i ? 'Transparent digits' : 'Show Matrix date'}
          </label>
          <Switch
            id={key}
            checked={value[key]}
            onCheckedChange={(v) => onChange({ ...value, [key]: v })}
          />
        </div>
      ))}
      <button className="quiet" onClick={() => onChange({ ...matrixDefaults })}>
        Reset Matrix settings
      </button>
    </section>
  );
}
