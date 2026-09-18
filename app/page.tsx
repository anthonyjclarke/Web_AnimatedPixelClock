'use client';
import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Maximize,
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  Sun,
  Grid2X2,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AmbientControls } from './ambient-controls';
import { AmbientRenderer, parsePca, type PcaAnimation } from './ambient';
import {
  ambientDefaults,
  ambientHour,
  ambientStyles,
  normalizeAmbient,
  normalizeCycleSeconds,
  scheduledAmbient,
} from './ambient-settings';
import { customAnimationStorage } from './ambient-storage';
import { VisualizerPanel } from './visualizer-panel';
import { DoomControls } from './doom-controls';
import { doomDefaults, normalizeDoom } from './doom';
import { PongControls } from './pong-controls';
import { pongDefaults, normalizePong } from './pong';
import { TronControls } from './tron-controls';
import { tronDefaults, normalizeTron } from './tron';
import { MatrixControls } from './matrix-controls';
import { matrixDefaults, normalizeMatrix } from './matrix';
import { DinoControls } from './dino-controls';
import { dinoDefaults, normalizeDino } from './dino';
import { AsteroidsControls } from './asteroids-controls';
import { asteroidsDefaults, normalizeAsteroids } from './asteroids';
import { SpaceControls } from './space-controls';
import { spaceDefaults, normalizeSpace } from './space';
import { SnakeControls } from './snake-controls';
import { snakeDefaults, normalizeSnake } from './snake';
import { dateFormats, normalizeDateFormat } from './classic-clocks';
import { CharacterControls } from './character-controls';
import {
  marioDefaults,
  pacmanDefaults,
  normalizeMario,
  normalizePacman,
} from './character-settings';
import { TetrisControls } from './tetris-controls';
import { normalizeTetris, tetrisDefaults } from './tetris-settings';
import { PlaybackClock } from './frame-time';
import { renderClock, resetClock, styles, type Options } from './renderer';
const defaults: Options = {
  style: 'Tetris',
  brightness: 85,
  dateFormat: 0,
  hour24: true,
  date: true,
  blink: true,
  glow: true,
  zone: 'local',
  color: '#64e6ac',
  motion: true,
  doom: { ...doomDefaults },
  pong: { ...pongDefaults },
  tron: { ...tronDefaults },
  matrix: { ...matrixDefaults },
  dino: { ...dinoDefaults },
  asteroids: { ...asteroidsDefaults },
  space: { ...spaceDefaults },
  snake: { ...snakeDefaults },
  tetris: { ...tetrisDefaults },
  mario: { ...marioDefaults },
  pacman: { ...pacmanDefaults },
};
export default function Home() {
  const [mode, setMode] = useState('clock');
  const [o, setO] = useState(defaults),
    [ready, setReady] = useState(false),
    [cycle, setCycle] = useState(false),
    [replay, setReplay] = useState(0),
    [now, setNow] = useState(new Date(0)),
    [error, setError] = useState('');
  const [ambient, setAmbient] = useState(ambientDefaults),
    [forcedAmbient, setForcedAmbient] = useState(false),
    [skipWindow, setSkipWindow] = useState(false),
    [cycleSeconds, setCycleSeconds] = useState(30);
  const [custom, setCustom] = useState<PcaAnimation | null>(null),
    [customName, setCustomName] = useState(''),
    [fine, setFine] = useState<PcaAnimation | null>(null),
    [ambientError, setAmbientError] = useState('');
  const ambientRenderer = useRef<AmbientRenderer | null>(null),
    ambientTime = useRef(new PlaybackClock());
  const scheduled =
    ready && scheduledAmbient(ambient, ambientHour(now, o.zone));
  const ambientActive = forcedAmbient || (scheduled && !skipWindow);
  useEffect(() => {
    if (!scheduled) setSkipWindow(false);
  }, [scheduled]);
  useEffect(() => {
    ambientRenderer.current?.reset();
    ambientTime.current.reset();
  }, [ambientActive, replay]);
  useEffect(() => {
    let live = true;
    customAnimationStorage()
      .then((file) => {
        if (live && file) {
          setCustom(parsePca(file.bytes));
          setCustomName(file.name);
        }
      })
      .catch(() => {
        if (live)
          setAmbientError(
            'Custom animation storage is unavailable in this browser.',
          );
      });
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    if (ambient.style !== 5 || fine) return;
    const controller = new AbortController();
    fetch('/ambient/this-is-fine.pca', { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw Error();
        return r.arrayBuffer();
      })
      .then((bytes) => {
        setFine(parsePca(bytes));
        setAmbientError('');
      })
      .catch((e) => {
        if (e.name !== 'AbortError')
          setAmbientError(
            'This Is Fine could not load. Space Invaders is playing instead; reload to retry.',
          );
      });
    return () => controller.abort();
  }, [ambient.style, fine]);
  const loadCustom = async (file: File) => {
    try {
      if (file.size > 1536 * 1024)
        throw Error('Animation exceeds the original 1.5 MiB limit.');
      const bytes = await file.arrayBuffer(),
        parsed = parsePca(bytes);
      setCustom(parsed);
      setCustomName(file.name);
      ambientRenderer.current?.reset();
      setAmbientError('');
      try {
        await customAnimationStorage({ name: file.name, bytes });
      } catch {
        setAmbientError(
          'Animation is playing, but could not be saved. Choose it again after reload.',
        );
      }
    } catch (e) {
      setAmbientError(
        e instanceof Error ? e.message : 'Could not load animation.',
      );
    }
  };
  const removeCustom = async () => {
    try {
      await customAnimationStorage(null);
      setCustom(null);
      setCustomName('');
      setAmbientError('');
    } catch {
      setAmbientError('Could not remove the saved animation.');
    }
  };
  const canvas = useRef<HTMLCanvasElement>(null),
    panel = useRef<HTMLDivElement>(null);
  const animationTime = useRef(new PlaybackClock()),
    previousReplay = useRef(0);
  useEffect(() => {
    animationTime.current.reset();
    if (canvas.current)
      resetClock(canvas.current, replay !== previousReplay.current);
    previousReplay.current = replay;
  }, [o.style, replay]);
  const update = (patch: Partial<Options>) => setO((v) => ({ ...v, ...patch }));
  useEffect(() => {
    try {
      const display = JSON.parse(
        localStorage.getItem('pixel-clock-display') || 'null',
      );
      if (display) {
        setAmbient(normalizeAmbient(display.ambient));
        setCycleSeconds(normalizeCycleSeconds(display.cycleSeconds));
        setCycle(display.cycle === true);
      }
    } catch {}
    try {
      const saved = JSON.parse(localStorage.getItem('pixel-clock') || 'null');
      if (saved && styles.includes(saved.style)) {
        new Intl.DateTimeFormat('en', {
          timeZone: saved.zone === 'local' ? undefined : saved.zone,
        });
        setO({
          ...defaults,
          ...saved,
          color:
            typeof saved.color === 'string' &&
            /^#[0-9a-f]{6}$/i.test(saved.color)
              ? saved.color
              : defaults.color,
          brightness:
            typeof saved.brightness === 'number' &&
            Number.isFinite(saved.brightness)
              ? Math.max(10, Math.min(100, saved.brightness))
              : defaults.brightness,
          ...Object.fromEntries(
            ['hour24', 'date', 'blink', 'glow', 'motion'].map((k) => [
              k,
              typeof saved[k] === 'boolean'
                ? saved[k]
                : defaults[k as keyof Options],
            ]),
          ),
          dateFormat: normalizeDateFormat(saved.dateFormat),
          doom: normalizeDoom(saved.doom),
          pong: normalizePong(saved.pong),
          tron: normalizeTron(saved.tron),
          matrix: normalizeMatrix(saved.matrix),
          dino: normalizeDino(saved.dino),
          asteroids: normalizeAsteroids(saved.asteroids),
          space: normalizeSpace(saved.space),
          snake: normalizeSnake(saved.snake),
          tetris: normalizeTetris(saved.tetris),
          mario: normalizeMario(saved.mario),
          pacman: normalizePacman(saved.pacman),
        });
      }
    } catch {}
    setReady(true);
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem('pixel-clock', JSON.stringify(o));
      } catch {}
  }, [o, ready]);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem(
          'pixel-clock-display',
          JSON.stringify({ ambient, cycle, cycleSeconds }),
        );
      } catch {}
  }, [ready, ambient, cycle, cycleSeconds]);
  useEffect(() => {
    if (!cycle || mode !== 'clock' || ambientActive) return;
    const t = setInterval(
      () =>
        setO((v) => ({
          ...v,
          style: styles[(styles.indexOf(v.style) + 1) % styles.length],
        })),
      cycleSeconds * 1000,
    );
    return () => clearInterval(t);
  }, [cycle, mode, cycleSeconds, ambientActive]);
  useEffect(() => {
    if (mode !== 'clock' || !canvas.current) return;
    let frame = 0;
    const draw = (t: number) => {
      if (ambientActive) {
        ambientTime.current.advance(t, o.motion);
        ambientRenderer.current ??= new AmbientRenderer();
        ambientRenderer.current.render(
          ambientTime.current.seconds,
          ambient.style,
          ambient.style === 5 ? fine : custom,
        );
        ambientRenderer.current.present(
          canvas.current!,
          new Date(),
          o.zone,
          o.hour24,
          o.blink,
          ambient.showClock,
        );
      } else {
        animationTime.current.advance(t, o.motion);
        renderClock(
          canvas.current!,
          o,
          animationTime.current.seconds,
          new Date(),
        );
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [o, replay, mode, ambientActive, ambient, fine, custom]);
  useEffect(() => {
    const ctx = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options: { signal: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!ctx?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      Promise.resolve(
        ctx.registerTool(
          {
            name: 'set_clock_style',
            description:
              'Select an arcade clock style and stop automatic rotation.',
            inputSchema: {
              type: 'object',
              properties: { style: { type: 'string', enum: styles } },
              required: ['style'],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false, untrustedContentHint: false },
            execute(input: unknown) {
              const style = (input as { style?: string })?.style;
              if (!style || !styles.includes(style))
                throw new Error('Choose a supported clock style');
              flushSync(() => {
                setMode('clock');
                setForcedAmbient(false);
                setSkipWindow(true);
                setCycle(false);
                setO((v) => ({ ...v, style }));
              });
              return { style, cycling: false };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {});
    } catch {}
    return () => lifecycle.abort();
  }, []);
  const full = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await panel.current?.requestFullscreen();
    } catch {
      setError(
        'Fullscreen is unavailable in this browser. Open the clock in a separate browser window.',
      );
    }
  };
  return (
    <main>
      <header>
        <a className="brand" href="/" aria-label="Pixel Clock home">
          <span className="brandmark">
            <Grid2X2 size={22} />
          </span>
          PIXEL<span className="brand-light">CLOCK</span>
        </a>
        <span className="edition">
          THE ARCADE COLLECTION <span> / </span> WEB EDITION
        </span>
        <span className="live">
          <i />{' '}
          {process.env.NODE_ENV === 'development'
            ? 'LOCAL · WEB EDITION'
            : 'LIVE'}
        </span>
      </header>
      <section className="workspace">
        <div className="intro">
          <div>
            <p className="eyebrow">A LITTLE ARCADE. ALL THE TIME.</p>
            <h1>Time, in pixels.</h1>
          </div>
          {mode === 'clock' && (
            <button className="quiet" onClick={full}>
              <Maximize size={16} /> Fullscreen
            </button>
          )}
        </div>
        <Tabs
          className="clock-mode"
          value={mode}
          onValueChange={(value) => setMode(String(value))}
        >
          <TabsList className="mode-tabs" aria-label="Display mode">
            <TabsTrigger value="clock">Clock</TabsTrigger>
            <TabsTrigger value="visualizer">Audio visualizer</TabsTrigger>
          </TabsList>
          <TabsContent value="clock" keepMounted>
            <div className="display-section" ref={panel}>
              <div className="device">
                <div className="device-top">
                  <span>ANIMATED PIXEL CLOCK</span>
                  <span>128 × 64 RGB</span>
                </div>
                <div
                  className={'screen ' + (o.glow ? 'bloom' : '')}
                  style={{ filter: `brightness(${o.brightness / 100})` }}
                >
                  <canvas
                    ref={canvas}
                    width={1024}
                    height={512}
                    aria-label={`${ambientActive ? ambientStyles[ambient.style] : o.style} clock, ${ready ? now.toLocaleTimeString('en-AU', { timeZone: o.zone === 'local' ? undefined : o.zone, hour12: !o.hour24 }) : 'loading'}`}
                  />
                </div>
                <div className="device-bottom">
                  <span>
                    <i />{' '}
                    {ambientActive
                      ? ambientStyles[ambient.style].toUpperCase()
                      : o.style.toUpperCase()}
                  </span>
                  <span>● ● ●</span>
                </div>
              </div>
              <button className="exit-full" onClick={full}>
                Exit fullscreen
              </button>
            </div>
            <div className="playback">
              <div>
                <span className="status-dot" />
                {ambientActive ? ambientStyles[ambient.style] : o.style}
                <span className="muted">
                  {' '}
                  / {o.motion ? 'Animation running' : 'Motion paused'}
                </span>
              </div>
              <div className="playback-actions">
                <button
                  title={o.motion ? 'Pause animation' : 'Resume animation'}
                  aria-label={o.motion ? 'Pause animation' : 'Resume animation'}
                  onClick={() => update({ motion: !o.motion })}
                >
                  {o.motion ? <Pause size={17} /> : <Play size={17} />}
                </button>
                <button
                  title={
                    ambientActive
                      ? 'Restart screensaver'
                      : 'Replay digit animation'
                  }
                  aria-label={
                    ambientActive
                      ? 'Restart screensaver'
                      : 'Replay digit animation'
                  }
                  onClick={() => {
                    update({ motion: true });
                    setReplay((v) => v + 1);
                  }}
                >
                  <RotateCcw size={17} />
                </button>
                <button
                  title="Next style"
                  aria-label="Next style"
                  onClick={() =>
                    update({
                      style:
                        styles[(styles.indexOf(o.style) + 1) % styles.length],
                    })
                  }
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
            <div className="lower">
              <section className="collection">
                <div className="section-heading">
                  <h2>Choose your clock</h2>
                </div>
                <div className="styles">
                  {styles.map((s, i) => (
                    <button
                      key={s}
                      className={
                        'style-card ' + (s === o.style ? 'selected' : '')
                      }
                      onClick={() => {
                        setCycle(false);
                        update({ style: s });
                      }}
                      aria-pressed={s === o.style}
                    >
                      <span
                        className="style-glyph"
                        style={{
                          color: [
                            '#63e4aa',
                            '#ffb25b',
                            '#ba9cff',
                            '#f9d966',
                            '#59dcff',
                          ][i % 5],
                        }}
                      >
                        {
                          [
                            '▟',
                            '▥',
                            '◉',
                            '⌁',
                            '▦',
                            '✦',
                            '⌐',
                            '↟',
                            '▧',
                            '╬',
                            '▣',
                            '♨',
                            '◷',
                            '▤',
                          ][i]
                        }
                      </span>
                      <span>{s}</span>
                      <span className="selected-dot" />
                    </button>
                  ))}
                </div>
              </section>
              <aside className="settings">
                <h2>Display settings</h2>
                <div className="setting-row">
                  <label htmlFor="cycle-styles">Cycle clock styles</label>
                  <Switch
                    id="cycle-styles"
                    checked={cycle}
                    onCheckedChange={setCycle}
                  />
                </div>
                <div className="setting-row">
                  <label htmlFor="cycle-seconds">Cycle interval</label>
                  <select
                    id="cycle-seconds"
                    className="cycle-seconds"
                    value={cycleSeconds}
                    onChange={(e) =>
                      setCycleSeconds(
                        normalizeCycleSeconds(Number(e.target.value)),
                      )
                    }
                  >
                    <option value={30}>30s</option>
                    <option value={60}>1m</option>
                    <option value={300}>5m</option>
                    <option value={900}>15m</option>
                  </select>
                </div>
                <div className="brightness">
                  <label id="brightness">
                    <Sun size={15} /> Brightness
                  </label>
                  <output>{o.brightness}%</output>
                </div>
                <Slider
                  aria-labelledby="brightness"
                  min={10}
                  max={100}
                  value={[o.brightness]}
                  onValueChange={(v) =>
                    update({ brightness: Array.isArray(v) ? v[0] : v })
                  }
                />
                <div className="setting-row">
                  <label htmlFor="hour24">24-hour time</label>
                  <Switch
                    id="hour24"
                    checked={o.hour24}
                    onCheckedChange={(v) => update({ hour24: v })}
                  />
                </div>
                {o.style !== 'Tetris' &&
                  o.style !== 'Snake' &&
                  o.style !== 'Asteroids' &&
                  o.style !== 'Dino Runner' &&
                  o.style !== 'Matrix Rain' &&
                  o.style !== 'TRON' &&
                  o.style !== 'Bomberman' &&
                  o.style !== 'Pong' &&
                  o.style !== 'Doom Fire' && (
                    <div className="setting-row">
                      <label htmlFor="date">Show date</label>
                      <Switch
                        id="date"
                        checked={o.date}
                        onCheckedChange={(v) => update({ date: v })}
                      />
                    </div>
                  )}
                {(o.style === 'Standard' ||
                  o.style === 'Large' ||
                  o.style === 'Snake' ||
                  o.style === 'Space Invaders' ||
                  o.style === 'Asteroids' ||
                  o.style === 'Dino Runner' ||
                  o.style === 'Matrix Rain' ||
                  o.style === 'Pong' ||
                  o.style === 'Doom Fire') && (
                  <>
                    <label className="zone-label" id="date-format-label">
                      Date format
                    </label>
                    <Select
                      items={Object.fromEntries(
                        dateFormats.map((label, i) => [String(i), label]),
                      )}
                      value={String(o.dateFormat ?? 0)}
                      onValueChange={(v) =>
                        v !== null &&
                        update({ dateFormat: normalizeDateFormat(Number(v)) })
                      }
                    >
                      <SelectTrigger
                        className="zone-select"
                        aria-labelledby="date-format-label"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {dateFormats.map((label, i) => (
                          <SelectItem key={i} value={String(i)}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}
                <div className="setting-row">
                  <label htmlFor="glow">LED glow</label>
                  <Switch
                    id="glow"
                    checked={o.glow}
                    onCheckedChange={(v) => update({ glow: v })}
                  />
                </div>
                <div className="setting-row">
                  <label htmlFor="blink">Blink colon</label>
                  <Switch
                    id="blink"
                    checked={o.blink}
                    onCheckedChange={(v) => update({ blink: v })}
                  />
                </div>
                <div className="setting-row">
                  <label htmlFor="color">Digit color</label>
                  <input
                    id="color"
                    type="color"
                    value={o.color}
                    onChange={(e) => update({ color: e.target.value })}
                  />
                </div>
                <label className="zone-label" id="zone-label">
                  Timezone
                </label>
                <Select
                  value={o.zone}
                  onValueChange={(v) => v && update({ zone: v })}
                >
                  <SelectTrigger
                    aria-labelledby="zone-label"
                    className="zone-select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['local', ...Intl.supportedValuesOf('timeZone')].map(
                      (z) => (
                        <SelectItem key={z} value={z}>
                          {z === 'local'
                            ? 'Device timezone'
                            : z.replaceAll('_', ' ')}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
                {o.style === 'Tetris' && (
                  <TetrisControls
                    value={o.tetris ?? tetrisDefaults}
                    onChange={(tetris) => update({ tetris })}
                  />
                )}
                {o.style === 'Mario' && (
                  <CharacterControls
                    kind="Mario"
                    value={o.mario ?? marioDefaults}
                    onChange={(mario) =>
                      update({ mario: normalizeMario(mario) })
                    }
                  />
                )}{' '}
                {o.style === 'Pac-Man' && (
                  <CharacterControls
                    kind="Pac-Man"
                    value={o.pacman ?? pacmanDefaults}
                    onChange={(pacman) =>
                      update({ pacman: normalizePacman(pacman) })
                    }
                  />
                )}
                {o.style === 'Snake' && (
                  <SnakeControls
                    value={o.snake ?? snakeDefaults}
                    onChange={(snake) => update({ snake })}
                  />
                )}
                {o.style === 'Space Invaders' && (
                  <SpaceControls
                    value={o.space ?? spaceDefaults}
                    onChange={(space) => update({ space })}
                  />
                )}
                {o.style === 'Asteroids' && (
                  <AsteroidsControls
                    value={o.asteroids ?? asteroidsDefaults}
                    onChange={(asteroids) => update({ asteroids })}
                  />
                )}
                {o.style === 'Dino Runner' && (
                  <DinoControls
                    value={o.dino ?? dinoDefaults}
                    onChange={(dino) => update({ dino })}
                  />
                )}
                {o.style === 'Matrix Rain' && (
                  <MatrixControls
                    value={o.matrix ?? matrixDefaults}
                    onChange={(matrix) => update({ matrix })}
                  />
                )}
                {o.style === 'TRON' && (
                  <TronControls
                    value={o.tron ?? tronDefaults}
                    onChange={(tron) => update({ tron })}
                  />
                )}
                {o.style === 'Pong' && (
                  <PongControls
                    value={o.pong ?? pongDefaults}
                    onChange={(pong) => update({ pong })}
                  />
                )}
                {o.style === 'Doom Fire' && (
                  <DoomControls
                    value={o.doom ?? doomDefaults}
                    onChange={(doom) => update({ doom })}
                  />
                )}
                <AmbientControls
                  value={ambient}
                  onChange={setAmbient}
                  active={ambientActive}
                  forced={forcedAmbient}
                  onStart={() => {
                    setForcedAmbient(true);
                    update({ motion: true });
                  }}
                  onStop={() => {
                    setForcedAmbient(false);
                    setSkipWindow(true);
                  }}
                  customName={customName}
                  onFile={loadCustom}
                  onRemove={removeCustom}
                  error={ambientError}
                />
              </aside>
            </div>
          </TabsContent>
          <TabsContent value="visualizer">
            {mode === 'visualizer' && <VisualizerPanel clock={o} />}
          </TabsContent>
        </Tabs>
        {error && <p role="alert">{error}</p>}
        <footer>
          <span>
            Inspired by{' '}
            <a
              href="https://github.com/Keralots/AnimatedPixelClock"
              target="_blank"
              rel="noopener noreferrer"
            >
              AnimatedPixelClock by Keralots
            </a>
            {' · '}
            <a
              href="https://github.com/anthonyjclarke/Web_AnimatedPixelClock"
              target="_blank"
              rel="noopener noreferrer"
            >
              Web edition on GitHub
            </a>
          </span>
          <span>
            Your time. Your timezone. <span className="footer-pixel">▪</span>
          </span>
        </footer>
      </section>
    </main>
  );
}
