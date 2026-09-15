import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { dinoDefaults, type DinoSettings } from './dino';
const frequencies = { '0': 'Rare', '1': 'Normal', '2': 'Frequent' };
export function DinoControls({
  value,
  onChange,
}: {
  value: DinoSettings;
  onChange: (value: DinoSettings) => void;
}) {
  return (
    <section className="tetris-settings">
      <h2>Dino settings</h2>
      <p className="audio-note">
        Dino hops over approaching cacti. The pterodactyl carries away changed
        digits, then replacements drop into place.
      </p>
      <div className="brightness">
        <label id="dino-speed-label">Run speed</label>
        <output>{(value.dinoSpeed / 10).toFixed(1)}</output>
      </div>
      <Slider
        aria-labelledby="dino-speed-label"
        min={5}
        max={30}
        step={1}
        value={[value.dinoSpeed]}
        onValueChange={(n) =>
          onChange({ ...value, dinoSpeed: Array.isArray(n) ? n[0] : n })
        }
      />
      <label className="zone-label" id="dino-frequency-label">
        Cactus frequency
      </label>
      <Select
        items={frequencies}
        value={String(value.dinoCactusFreq)}
        onValueChange={(n) =>
          n !== null && onChange({ ...value, dinoCactusFreq: Number(n) })
        }
      >
        <SelectTrigger
          className="zone-select"
          aria-labelledby="dino-frequency-label"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(frequencies).map(([id, label]) => (
            <SelectItem key={id} value={id}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {(['dinoShowClouds', 'dinoShowDate'] as const).map((key, i) => (
        <div className="setting-row" key={key}>
          <label htmlFor={key}>{i ? 'Show Dino date' : 'Show clouds'}</label>
          <Switch
            id={key}
            checked={value[key]}
            onCheckedChange={(v) => onChange({ ...value, [key]: v })}
          />
        </div>
      ))}
      <button className="quiet" onClick={() => onChange({ ...dinoDefaults })}>
        Reset Dino settings
      </button>
    </section>
  );
}
