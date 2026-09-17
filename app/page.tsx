'use client';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  Crop,
  ImagePlus,
  ArrowDownToLine,
  LockKeyhole,
  Smartphone,
  Check,
  CircleHelp,
  ShieldCheck,
  RotateCcw,
  Share2,
  Camera,
  Flashlight,
  Phone,
  MessageCircle,
  Compass,
  Music,
  ChevronDown,
  SlidersHorizontal,
  X,
  ArrowUpRight,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DEVICES,
  DEFAULTS,
  Settings,
  deviceFor,
  renderWallpaper,
  makeSample,
  validateSettings,
  needsLightGuides,
} from '@/lib/wallpaper';
import { encodeCurrentPng } from '@/lib/export';

type Source = {
  image: CanvasImageSource;
  width: number;
  height: number;
  name: string;
  sample: boolean;
};
type Exported = { file: File; url: string; width: number; height: number };
const colors = [
  ['#e4eaf5', 'ブルー'],
  ['#f7f7f7', 'ホワイト'],
  ['#e0e9dd', 'グリーン'],
  ['#e9ddef', 'ライラック'],
  ['#252b38', 'チャコール'],
];
function Range({
  label,
  value,
  onChange,
  min,
  max,
  unit = '%',
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  unit?: string;
}) {
  const labelId = useId();
  return (
    <div className="range-field">
      <label id={labelId}>
        {label}
        <span>
          {value}
          {unit}
        </span>
      </label>
      <Slider
        aria-labelledby={labelId}
        value={[value]}
        min={min}
        max={max}
        step={1}
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
      />
    </div>
  );
}
export default function Home() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS),
    [mode, setMode] = useState('lock'),
    [guides, setGuides] = useState(true),
    [source, setSource] = useState<Source | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [dragging, setDragging] = useState(false),
    [help, setHelp] = useState(false),
    [exported, setExported] = useState<Exported | null>(null),
    [exportOpen, setExportOpen] = useState(false),
    [shareable, setShareable] = useState(false),
    [saving, setSaving] = useState(false),
    [renderError, setRenderError] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null),
    inputRef = useRef<HTMLInputElement>(null),
    loadSequence = useRef(0),
    sourceUrl = useRef(''),
    exportUrl = useRef(''),
    savingRef = useRef(false),
    current = useRef({ settings, source });
  current.current = { settings, source };
  const device = deviceFor(settings.deviceId),
    dark = needsLightGuides(settings.color);
  const patch = useCallback(
    (next: Partial<Settings>) => setSettings((s) => ({ ...s, ...next })),
    [],
  );
  const useSample = useCallback(() => {
    try {
      loadSequence.current++;
      setBusy(false);
      if (sourceUrl.current) URL.revokeObjectURL(sourceUrl.current);
      sourceUrl.current = '';
      const image = makeSample();
      setSource({
        image,
        width: image.width,
        height: image.height,
        name: 'サンプルのメモ',
        sample: true,
      });
      patch({ cropTop: 0, cropBottom: 0, scale: 100, position: 0 });
      setError('');
    } catch {
      setError('サンプルを表示できません。画像を選んでください。');
    }
  }, [patch]);
  useEffect(() => {
    useSample();
    return () => {
      loadSequence.current++;
      if (sourceUrl.current) URL.revokeObjectURL(sourceUrl.current);
      if (exportUrl.current) URL.revokeObjectURL(exportUrl.current);
    };
  }, [useSample]);
  useEffect(() => {
    if (!source || !canvasRef.current) return;
    try {
      renderWallpaper(
        canvasRef.current,
        source.image,
        source.width,
        source.height,
        settings,
      );
      setRenderError('');
    } catch (e) {
      setRenderError(
        e instanceof Error ? e.message : 'プレビューを作成できませんでした。',
      );
    }
  }, [source, settings]);
  const loadFile = useCallback(
    async (file: File) => {
      const sequence = ++loadSequence.current;
      setError('');
      if (
        !/^image\/(png|jpeg|webp)$/.test(file.type) &&
        !(/\.(png|jpe?g|webp)$/i.test(file.name) && !file.type)
      ) {
        setError(
          'PNG・JPEG・WebPの画像を選んでください。HEICはJPEGに変換してください。',
        );
        setBusy(false);
        return;
      }
      if (file.size > 30 * 1024 * 1024) {
        setError('30MB以下の画像を選んでください。');
        setBusy(false);
        return;
      }
      setBusy(true);
      const url = URL.createObjectURL(file);
      try {
        const img = new Image();
        img.src = url;
        await img.decode();
        if (sequence !== loadSequence.current) {
          URL.revokeObjectURL(url);
          return;
        }
        if (
          !img.naturalWidth ||
          !img.naturalHeight ||
          img.naturalWidth * img.naturalHeight > 40_000_000
        )
          throw new Error(
            '画像が大きすぎます。4000万画素以下に縮小してください。',
          );
        if (sourceUrl.current) URL.revokeObjectURL(sourceUrl.current);
        sourceUrl.current = url;
        setSource({
          image: img,
          width: img.naturalWidth,
          height: img.naturalHeight,
          name: file.name,
          sample: false,
        });
        patch({ cropTop: 0, cropBottom: 0, scale: 100, position: 0 });
      } catch (e) {
        URL.revokeObjectURL(url);
        if (sequence === loadSequence.current)
          setError(
            e instanceof Error && e.message.includes('4000')
              ? e.message
              : '画像を読み込めませんでした。別のPNG・JPEG・WebPをお試しください。',
          );
      } finally {
        if (sequence === loadSequence.current) setBusy(false);
      }
    },
    [patch],
  );
  useEffect(() => {
    const paste = (e: ClipboardEvent) => {
      if (exportOpen || help) return;
      const file = Array.from(e.clipboardData?.items ?? [])
        .find((i) => i.type.startsWith('image/'))
        ?.getAsFile();
      if (file) {
        e.preventDefault();
        void loadFile(file);
      }
    };
    window.addEventListener('paste', paste);
    return () => window.removeEventListener('paste', paste);
  }, [loadFile, exportOpen, help]);
  async function prepareExport() {
    if (!source || busy || savingRef.current) return;
    savingRef.current = true;
    const sourceVersion = loadSequence.current;
    const isCurrent = () =>
      current.current.settings === settings &&
      current.current.source === source &&
      loadSequence.current === sourceVersion;
    setSaving(true);
    setError('');
    try {
      const output = document.createElement('canvas');
      renderWallpaper(
        output,
        source.image,
        source.width,
        source.height,
        settings,
      );
      const blob = await encodeCurrentPng(output, isCurrent);
      if (!blob) {
        setError(
          '作成中に画像や設定が変わりました。もう一度「壁紙を保存する」を押してください。',
        );
        return;
      }
      const file = new File(
        [blob],
        `pitakabe-iphone-${device.id}-${device.width}x${device.height}.png`,
        { type: 'image/png' },
      );
      const url = URL.createObjectURL(blob);
      if (exportUrl.current) URL.revokeObjectURL(exportUrl.current);
      exportUrl.current = url;
      setExported({ file, url, width: device.width, height: device.height });
      // A failed optional share capability check must not block PNG download.
      let canShare = false;
      try {
        canShare = Boolean(navigator.canShare?.({ files: [file] }));
      } catch {}
      setShareable(canShare);
      setExportOpen(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : '保存用の画像を作成できませんでした。',
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }
  async function share() {
    if (!exported) return;
    try {
      await navigator.share({ files: [exported.file] });
    } catch (e) {
      if (e instanceof Error && e.name !== 'AbortError')
        setError(
          '共有を開けませんでした。「PNGをダウンロード」か画像の長押しをお試しください。',
        );
    }
  }
  // Feature-detect the optional WebMCP imperative registry; the editor works without it.
  useEffect(() => {
    type Tool = {
      name: string;
      title: string;
      description: string;
      inputSchema: object;
      annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
      execute: (input: unknown) => unknown;
    };
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: Tool,
            options: { signal: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = (tool: Tool) => {
      try {
        void Promise.resolve(
          context.registerTool(tool, { signal: lifecycle.signal }),
        ).catch(() => {});
      } catch {}
    };
    register({
      name: 'read_wallpaper_settings',
      title: '壁紙の設定を読む',
      description:
        'Return the current wallpaper settings and available iPhone sizes. Does not read image contents.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: () => ({
        settings: current.current.settings,
        hasImage: Boolean(current.current.source),
        devices: DEVICES.map((d) => ({
          id: d.id,
          name: d.name,
          width: d.width,
          height: d.height,
        })),
      }),
    });
    register({
      name: 'configure_wallpaper',
      title: '壁紙の余白を調整',
      description:
        'Update the current wallpaper preview. No upload, download, or sharing occurs.',
      inputSchema: {
        type: 'object',
        properties: {
          deviceId: { type: 'string', enum: DEVICES.map((d) => d.id) },
          top: { type: 'number', minimum: 8, maximum: 50 },
          bottom: { type: 'number', minimum: 8, maximum: 30 },
          scale: { type: 'number', minimum: 40, maximum: 100 },
          position: { type: 'number', minimum: -100, maximum: 100 },
          cropTop: { type: 'number', minimum: 0, maximum: 40 },
          cropBottom: { type: 'number', minimum: 0, maximum: 40 },
          color: { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input) => {
        const next = {
          ...current.current.settings,
          ...validateSettings(input),
        };
        flushSync(() => setSettings(next));
        return { settings: next, updated: true };
      },
    });
    return () => lifecycle.abort();
  }, []);
  return (
    <div className="app-shell">
      <header className="site-header">
        <a href="/" className="brand">
          <span className="brand-symbol">
            <Crop size={22} />
          </span>
          ぴた壁<span className="brand-en">PITAKABE</span>
        </a>
        <button className="help-link" onClick={() => setHelp(true)}>
          <CircleHelp size={17} />
          使いかた
        </button>
      </header>
      <main>
        <div className="page-intro">
          <div>
            <p className="eyebrow">SCREENSHOT → WALLPAPER</p>
            <h1>好きなスクショに、ちょうどいい余白。</h1>
            <p>時計も、下のバーも。重ならない位置に整えよう。</p>
          </div>
          <span className="device-badge">
            <Smartphone size={15} />
            iPhone 12〜17 / Air
          </span>
        </div>
        <div className="editor">
          <aside className="controls">
            <section className="control-section">
              <h2>
                <span className="step">01</span>スクショを選ぶ
              </h2>
              <label
                className={`upload-zone ${dragging ? 'dragging' : ''} ${source && !source.sample ? 'has-image' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  const f = e.dataTransfer.files[0];
                  if (f) void loadFile(f);
                }}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  aria-label="スクショを選ぶ"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void loadFile(f);
                    e.target.value = '';
                  }}
                />
                <span className="upload-icon">
                  <ImagePlus size={25} />
                </span>
                <strong>
                  {busy
                    ? '読み込み中…'
                    : source && !source.sample
                      ? '画像を変更する'
                      : '画像を選ぶ'}
                </strong>
                <span>
                  {source && !source.sample
                    ? source.name
                    : 'または、ここにドラッグ＆ドロップ'}
                </span>
                <small>
                  {source && !source.sample
                    ? `${source.width} × ${source.height} px`
                    : 'PNG・JPEG・WebP / 30MBまで'}
                </small>
              </label>
              <p className="privacy-note">
                <ShieldCheck size={13} />
                画像は端末内で処理されます
              </p>
              {source && !source.sample && (
                <button
                  className="text-button sample-reset"
                  onClick={useSample}
                >
                  サンプルに戻す
                </button>
              )}
            </section>
            <section className="control-section">
              <h2>
                <span className="step">02</span>機種を選ぶ
              </h2>
              <Select
                value={settings.deviceId}
                onValueChange={(v) => {
                  if (v) patch({ deviceId: String(v) });
                }}
              >
                <SelectTrigger
                  className="device-select"
                  aria-label="iPhoneの機種"
                >
                  <SelectValue>{device.name}</SelectValue>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {DEVICES.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="dimension-note">
                {device.width} × {device.height} px<span>原寸で書き出し</span>
              </p>
            </section>
            <section className="control-section adjust-section">
              <div className="section-heading">
                <h2>
                  <span className="step">03</span>余白を整える
                </h2>
                <button
                  className="text-button"
                  onClick={() =>
                    patch({
                      top: mode === 'home' ? 8 : 32,
                      bottom: 18,
                      scale: 100,
                      position: 0,
                    })
                  }
                >
                  <RotateCcw size={12} />
                  {mode === 'home' ? 'Dockに合わせる' : 'おまかせ'}
                </button>
              </div>
              <Range
                label="上の余白"
                value={settings.top}
                min={8}
                max={50}
                onChange={(top) => patch({ top })}
              />
              <Range
                label="下の余白"
                value={settings.bottom}
                min={8}
                max={30}
                onChange={(bottom) => patch({ bottom })}
              />
              <div className="color-label">背景色</div>
              <div className="color-swatches">
                {colors.map(([c, name]) => (
                  <button
                    key={c}
                    aria-label={`背景色: ${name}`}
                    aria-pressed={settings.color === c}
                    className={
                      settings.color === c ? 'swatch selected' : 'swatch'
                    }
                    style={{
                      background: c,
                      color: c === '#252b38' ? '#fff' : undefined,
                    }}
                    onClick={() => patch({ color: c })}
                  >
                    {settings.color === c && <Check size={16} />}
                  </button>
                ))}
                <label className="custom-color" title="好きな色を選ぶ">
                  <span>＋</span>
                  <input
                    type="color"
                    value={settings.color}
                    aria-label="背景色を自由に選ぶ"
                    onChange={(e) => patch({ color: e.target.value })}
                  />
                </label>
              </div>
              <details className="advanced">
                <summary>
                  <SlidersHorizontal size={14} />
                  サイズ・位置・切り取り
                  <ChevronDown size={14} />
                </summary>
                <div className="advanced-body">
                  <Range
                    label="画像の大きさ"
                    value={settings.scale}
                    min={40}
                    max={100}
                    onChange={(scale) => patch({ scale })}
                  />
                  <Range
                    label="画像の上下位置"
                    value={settings.position}
                    min={-100}
                    max={100}
                    unit=""
                    onChange={(position) => patch({ position })}
                  />
                  <p className="range-hint">
                    −100で上寄せ、100で下寄せ。画像を小さくすると移動できます。
                  </p>
                  <Range
                    label="スクショの上を切り取る"
                    value={settings.cropTop}
                    min={0}
                    max={40}
                    onChange={(cropTop) => patch({ cropTop })}
                  />
                  <Range
                    label="スクショの下を切り取る"
                    value={settings.cropBottom}
                    min={0}
                    max={40}
                    onChange={(cropBottom) => patch({ cropBottom })}
                  />
                  <button
                    className="text-button"
                    onClick={() =>
                      patch({
                        scale: 100,
                        position: 0,
                        cropTop: 0,
                        cropBottom: 0,
                      })
                    }
                  >
                    切り取りと位置をリセット
                  </button>
                </div>
              </details>
            </section>
            <div className="export-area">
              <button
                className="export-button"
                disabled={!source || busy || saving || Boolean(renderError)}
                onClick={prepareExport}
              >
                <ArrowDownToLine size={18} />
                {saving ? '壁紙を作成中…' : '壁紙を保存する'}
              </button>
              <p>PNG / 原寸サイズ / ガイドなし</p>
              {(error || renderError) && (
                <p className="error-message" role="alert">
                  {error || renderError}
                </p>
              )}
            </div>
          </aside>
          <section className="preview-panel" aria-label="壁紙プレビュー">
            <div className="preview-sticky">
              <div className="preview-toolbar">
                <Tabs value={mode} onValueChange={(v) => setMode(String(v))}>
                  <TabsList
                    className="preview-tabs"
                    aria-label="プレビューする画面"
                  >
                    <TabsTrigger value="lock">
                      <LockKeyhole />
                      ロック画面
                    </TabsTrigger>
                    <TabsTrigger value="home">
                      <Smartphone />
                      ホーム画面
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <label className="guide-toggle">
                  ガイド
                  <Switch
                    aria-label="時計・Dock・余白ガイドを表示"
                    checked={guides}
                    onCheckedChange={setGuides}
                  />
                </label>
              </div>
              <div className="preview-stage">
                <div className="phone-wrap">
                  <div className={`phone ${dark ? 'dark-wallpaper' : ''}`}>
                    <div
                      className="phone-display"
                      style={{
                        aspectRatio: `${device.width}/${device.height}`,
                        background: settings.color,
                      }}
                    >
                      <canvas
                        ref={canvasRef}
                        className="wallpaper-canvas"
                        aria-label={`${device.name}用の壁紙。上の余白${settings.top}%、下の余白${settings.bottom}%。`}
                      />
                      {guides && (
                        <>
                          <div
                            className={device.notch ? 'island notch' : 'island'}
                          />
                          {mode === 'lock' ? (
                            <>
                              <div className="clock">
                                <span>9月7日 月曜日</span>
                                <strong>9:41</strong>
                              </div>
                              <div className="lock-controls">
                                <span>
                                  <Flashlight size={14} />
                                </span>
                                <span>
                                  <Camera size={14} />
                                </span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="home-status">
                                <span>9:41</span>
                                <span>••• ▰</span>
                              </div>
                              <div className="app-icons">
                                {['写真', 'カレンダー', 'メモ', '設定'].map(
                                  (label, i) => (
                                    <div key={label}>
                                      <span>
                                        {
                                          [
                                            <ImagePlus key="a" />,
                                            <span key="b">7</span>,
                                            <span key="c">≡</span>,
                                            <SlidersHorizontal key="d" />,
                                          ][i]
                                        }
                                      </span>
                                      <small>{label}</small>
                                    </div>
                                  ),
                                )}
                              </div>
                              <div className="dock">
                                {[Phone, MessageCircle, Compass, Music].map(
                                  (Icon, i) => (
                                    <span key={i}>
                                      <Icon size={21} />
                                    </span>
                                  ),
                                )}
                              </div>
                            </>
                          )}
                          <div
                            className="safe-zone top-zone"
                            style={{ height: `${settings.top}%` }}
                          />
                          <div
                            className="safe-zone bottom-zone"
                            style={{ height: `${settings.bottom}%` }}
                          />
                          <div className="home-indicator" />
                        </>
                      )}
                    </div>
                  </div>
                  {guides && (
                    <>
                      <div
                        className="float-tag top-tag"
                        style={{ top: `${Math.min(settings.top - 5, 29)}%` }}
                      >
                        <span />
                        {mode === 'lock' ? '時計のスペース' : '上の余白'}
                      </div>
                      <div
                        className="float-tag bottom-tag"
                        style={{
                          bottom: `${Math.max(settings.bottom - 5, 4)}%`,
                        }}
                      >
                        <span />
                        {mode === 'lock' ? '下の操作部' : 'Dockのスペース'}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="preview-footer">
                <span className="preview-status">
                  <span />
                  {source?.sample
                    ? 'サンプルでお試し中'
                    : '指定した余白に収めています'}
                </span>
                <span>
                  {device.width} × {device.height} px
                </span>
              </div>
              <p className="preview-disclaimer">
                {mode === 'lock'
                  ? '時計・ウィジェット・通知の表示は設定で変わります。実機で確認して余白を調整してください。'
                  : 'Dock・アイコンは表示例です。アプリやウィジェットとの重なりは、ホーム画面の配置によります。'}
              </p>
            </div>
          </section>
        </div>
        <footer className="page-footer">
          <p>写真に保存 → iPhoneの「設定」→「壁紙」から設定</p>
          <span>時計やガイドは保存されません。</span>
          <span className="footer-credit">
            制作：{' '}
            <a
              href="https://x.com/R5ni4"
              target="_blank"
              rel="noreferrer"
              aria-label="Xの@R5ni4を開く"
            >
              @R5ni4
            </a>
          </span>
        </footer>
      </main>
      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent className="help-dialog" showCloseButton={false}>
          <DialogClose className="dialog-close" aria-label="閉じる">
            <X size={20} />
          </DialogClose>
          <DialogTitle>ぴた壁の使いかた</DialogTitle>
          <DialogDescription>
            お気に入りのスクショを、余白つきの壁紙に。
          </DialogDescription>
          <ol className="help-steps">
            <li>
              <strong>スクショと機種を選ぶ</strong>
              <p>
                画面サイズに合わせ、画像全体を余白の中に収めます。パソコンでは画像の貼り付けにも対応。
              </p>
            </li>
            <li>
              <strong>時計やDockを見ながら調整</strong>
              <p>
                画面を切り替えて確認。「おまかせ」で時計の余白を、「Dockに合わせる」でホーム用の余白を設定できます。
              </p>
            </li>
            <li>
              <strong>壁紙を保存する</strong>
              <p>
                iPhoneでは「共有・写真に保存」をタップし、共有メニューの「画像を保存」を選択。表示されない場合は完成画像を長押ししてください。
              </p>
            </li>
            <li>
              <strong>iPhoneで壁紙に設定</strong>
              <p>
                「設定」→「壁紙」→「新しい壁紙を追加」→「写真」。プレビューで拡大率・位置を確認して追加します。ホーム画面の文字がぼける場合は「ぼかし」をオフにしてください。
              </p>
            </li>
          </ol>
          <div className="help-note">
            プレビューは目安です。iOS
            26の大きな時計やウィジェット、通知を使う場合は、実機に合わせて余白を広げてください。
          </div>
          <a
            className="source-link"
            href="https://support.apple.com/ja-jp/guide/iphone/iph3d267104/ios"
            target="_blank"
            rel="noreferrer"
          >
            Appleの壁紙設定ガイド
            <ArrowUpRight size={14} />
          </a>
        </DialogContent>
      </Dialog>
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="save-dialog" showCloseButton={false}>
          <DialogClose className="dialog-close" aria-label="閉じる">
            <X size={20} />
          </DialogClose>
          <DialogTitle>壁紙ができました</DialogTitle>
          <DialogDescription>
            {exported?.width} × {exported?.height} px ・ PNG ・ 時計とガイドなし
          </DialogDescription>
          {exported && (
            <>
              <img
                className="export-preview"
                src={exported.url}
                alt="完成した壁紙。iPhoneでは長押しでも保存できます。"
              />
              {shareable && (
                <button className="export-button" onClick={share}>
                  <Share2 size={17} />
                  共有・写真に保存
                </button>
              )}
              <a
                className={shareable ? 'download-link' : 'export-button'}
                href={exported.url}
                download={exported.file.name}
              >
                <ArrowDownToLine size={17} />
                PNGをダウンロード
              </a>
              <p className="save-tip">
                iPhoneでは上の画像を長押しして保存することもできます。壁紙の設定画面で位置と拡大率を確認してください。
              </p>
              {error && (
                <p className="error-message" role="alert">
                  {error}
                </p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
