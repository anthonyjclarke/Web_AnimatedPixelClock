import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { spaceDefaults, spaceRanges, type SpaceSettings } from './space';
export function SpaceControls({
  value,
  onChange,
}: {
  value: SpaceSettings;
  onChange: (v: SpaceSettings) => void;
}) {
  return (
    <section className="tetris-settings">
      <h2>Space settings</h2>
      <p className="audio-note">
        The character patrols, fires upward at changed digits, then returns to
        the center. Ship is the original default.
      </p>
      <label className="zone-label" id="space-type-label">
        Character
      </label>
      <Select
        items={{ '0': 'Invader', '1': 'Ship' }}
        value={String(value.spaceCharacterType)}
        onValueChange={(n) =>
          n !== null && onChange({ ...value, spaceCharacterType: Number(n) })
        }
      >
        <SelectTrigger
          className="zone-select"
          aria-labelledby="space-type-label"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="0">Invader</SelectItem>
          <SelectItem value="1">Ship</SelectItem>
        </SelectContent>
      </Select>
      {(
        [
          'spacePatrolSpeed',
          'spaceAttackSpeed',
          'spaceLaserSpeed',
          'spaceExplosionGravity',
        ] as const
      ).map((key, i) => {
        const [min, max, step] = spaceRanges[key];
        return (
          <div key={key}>
            <div className="brightness">
              <label id={key + '-label'}>
                {
                  [
                    'Patrol speed',
                    'Attack speed',
                    'Laser speed',
                    'Fragment gravity',
                  ][i]
                }
              </label>
              <output>{(value[key] / 10).toFixed(1)}</output>
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
      })}
      <button className="quiet" onClick={() => onChange({ ...spaceDefaults })}>
        Reset Space settings
      </button>
    </section>
  );
}
