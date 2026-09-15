import { Switch } from '@/components/ui/switch';
import { ambientStyles, type AmbientSettings } from './ambient-settings';
export function AmbientControls({
  value,
  onChange,
  active,
  forced,
  onStart,
  onStop,
  customName,
  onFile,
  onRemove,
  error,
}: {
  value: AmbientSettings;
  onChange: (v: AmbientSettings) => void;
  active: boolean;
  forced: boolean;
  onStart: () => void;
  onStop: () => void;
  customName: string;
  onFile: (file: File) => void;
  onRemove: () => void;
  error: string;
}) {
  const patch = (v: Partial<AmbientSettings>) => onChange({ ...value, ...v });
  return (
    <section className="ambient-controls">
      <h3>Ambient screensaver</h3>
      <p className="muted">
        Start now or use a schedule in the selected timezone.
      </p>
      <label className="zone-label" htmlFor="ambient-style">
        Scene
      </label>
      <select
        id="ambient-style"
        className="zone-select"
        value={value.style}
        onChange={(e) =>
          patch({ style: Number(e.target.value) as AmbientSettings['style'] })
        }
      >
        {Object.entries(ambientStyles).map(([id, label]) => (
          <option key={id} value={id}>
            {label}
          </option>
        ))}
      </select>
      {value.style === 6 && (
        <>
          <label className="zone-label" htmlFor="ambient-file">
            Custom PCA animation
          </label>
          <input
            id="ambient-file"
            type="file"
            accept=".pca"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = '';
            }}
          />
          <p className="muted">
            {customName ||
              'Choose a .pca file made with the original GIF converter. Until then, Space Invaders plays.'}
          </p>
          {customName && (
            <button className="quiet" onClick={onRemove}>
              Remove custom animation
            </button>
          )}
        </>
      )}
      <div className="setting-row">
        <label htmlFor="ambient-clock">Corner clock</label>
        <Switch
          id="ambient-clock"
          checked={value.showClock}
          onCheckedChange={(v) => patch({ showClock: v })}
        />
      </div>
      <div className="setting-row">
        <label htmlFor="ambient-schedule">Scheduled screensaver</label>
        <Switch
          id="ambient-schedule"
          checked={value.enabled}
          onCheckedChange={(v) => patch({ enabled: v })}
        />
      </div>
      <div className="ambient-hours">
        {(['startHour', 'endHour'] as const).map((key, i) => (
          <label key={key}>
            {i ? 'End hour' : 'Start hour'}
            <select
              aria-label={i ? 'Screensaver end hour' : 'Screensaver start hour'}
              className="zone-select"
              value={value[key]}
              onChange={(e) => patch({ [key]: Number(e.target.value) })}
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      {value.startHour === value.endHour && (
        <p className="muted">Matching hours give an empty schedule.</p>
      )}
      <div className="setting-row">
        <span role="status">
          {forced
            ? 'Running manually'
            : active
              ? 'Running on schedule'
              : 'Clock active'}
        </span>
        <button className="quiet" onClick={active ? onStop : onStart}>
          {active ? 'Stop screensaver' : 'Start now'}
        </button>
      </div>
      <p className="muted">
        Stop returns to the clock until the next scheduled window. Audio takes
        priority while its tab is open.
      </p>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
