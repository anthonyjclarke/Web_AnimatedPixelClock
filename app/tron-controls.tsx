import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { tronDefaults, type TronSettings } from './tron';
const variants = { '0': 'Motorcycle profile', '1': 'Overhead' };
export function TronControls({
  value,
  onChange,
}: {
  value: TronSettings;
  onChange: (value: TronSettings) => void;
}) {
  return (
    <section className="tetris-settings">
      <h2>TRON settings</h2>
      <p className="audio-note">
        Light cycles duel around the clock, then trace changed digits with neon
        trails.
      </p>
      <label className="zone-label" id="tron-bike-label">
        Motorcycle variant
      </label>
      <Select
        items={variants}
        value={String(value.tronBikeStyle)}
        onValueChange={(n) =>
          n !== null && onChange({ tronBikeStyle: Number(n) })
        }
      >
        <SelectTrigger
          className="zone-select"
          aria-labelledby="tron-bike-label"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(variants).map(([id, label]) => (
            <SelectItem key={id} value={id}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <button className="quiet" onClick={() => onChange({ ...tronDefaults })}>
        Reset TRON settings
      </button>
    </section>
  );
}
