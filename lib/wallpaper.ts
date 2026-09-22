export type Device = {
  id: string;
  name: string;
  width: number;
  height: number;
  notch?: boolean;
};
const group = (
  width: number,
  height: number,
  names: string[],
  notch = false,
): Device[] =>
  names.map((name) => ({
    id: name.toLowerCase().replaceAll(' ', '-'),
    name: `iPhone ${name}`,
    width,
    height,
    notch,
  }));
// Native portrait pixel dimensions. Official Apple sources are listed in DEVICE_SOURCES.md.
export const DEVICES: Device[] = [
  ...group(1206, 2622, ['17', '17 Pro']),
  ...group(1320, 2868, ['17 Pro Max']),
  ...group(1170, 2532, ['17e'], true),
  ...group(1260, 2736, ['Air']),
  ...group(1179, 2556, ['16']),
  ...group(1290, 2796, ['16 Plus']),
  ...group(1206, 2622, ['16 Pro']),
  ...group(1320, 2868, ['16 Pro Max']),
  ...group(1170, 2532, ['16e'], true),
  ...group(1179, 2556, ['15', '15 Pro']),
  ...group(1290, 2796, ['15 Plus', '15 Pro Max']),
  ...group(1170, 2532, ['14'], true),
  ...group(1284, 2778, ['14 Plus'], true),
  ...group(1179, 2556, ['14 Pro']),
  ...group(1290, 2796, ['14 Pro Max']),
  ...group(1080, 2340, ['13 mini'], true),
  ...group(1170, 2532, ['13', '13 Pro'], true),
  ...group(1284, 2778, ['13 Pro Max'], true),
  ...group(1080, 2340, ['12 mini'], true),
  ...group(1170, 2532, ['12', '12 Pro'], true),
  ...group(1284, 2778, ['12 Pro Max'], true),
];
export const DEVICE_SERIES = [
  '17',
  '16',
  '15',
  '14',
  '13',
  '12',
  'Air',
] as const;
export function seriesForDevice(id: string): string {
  return id === 'air' ? 'Air' : deviceFor(id).id.match(/^\d+/)![0];
}
export function devicesForSeries(series: string): Device[] {
  return DEVICES.filter((d) => seriesForDevice(d.id) === series);
}
// Keep Pro/mini/e etc. when the new series has it; otherwise select its base model.
export function deviceInSeries(series: string, currentId: string): Device {
  const models = devicesForSeries(series);
  const variant = currentId.replace(/^\d+/, '');
  return (
    models.find((d) => d.id.replace(/^\d+/, '') === variant) ??
    models.find((d) => d.id === series.toLowerCase()) ??
    models[0] ??
    deviceFor(currentId)
  );
}
export const PATTERNS = [
  { id: 'solid', label: '無地' },
  { id: 'stripes', label: 'ストライプ' },
  { id: 'diagonal', label: '斜め線' },
  { id: 'stars', label: '星' },
  { id: 'dots', label: '水玉' },
] as const;
export type Pattern = (typeof PATTERNS)[number]['id'];
// Approximate percentages from the supplied home-screen example, not Apple safe areas.
export const HOME_GUIDES = {
  search: { top: 80, height: 4 },
  dock: { top: 86, height: 12 },
  indicator: { bottom: 0.8, height: 0.5 },
} as const;
export function autoPlacement(mode: string) {
  return { top: mode === 'home' ? 8 : 32, bottom: 24, scale: 100, position: 0 };
}
export type Settings = {
  deviceId: string;
  top: number;
  bottom: number;
  scale: number;
  position: number;
  cropTop: number;
  cropBottom: number;
  color: string;
  pattern: Pattern;
};
export const DEFAULTS: Settings = {
  deviceId: '16',
  top: 32,
  bottom: 24,
  scale: 100,
  position: 0,
  cropTop: 0,
  cropBottom: 0,
  color: '#e4eaf5',
  pattern: 'solid',
};
export function deviceFor(id: string) {
  return (
    DEVICES.find((d) => d.id === id) ?? DEVICES.find((d) => d.id === '16')!
  );
}
export function geometry(
  sourceWidth: number,
  sourceHeight: number,
  s: Settings,
) {
  const d = deviceFor(s.deviceId);
  const sy = (sourceHeight * s.cropTop) / 100,
    sh = sourceHeight * (1 - (s.cropTop + s.cropBottom) / 100);
  const safe = {
    x: d.width * 0.06,
    y: (d.height * s.top) / 100,
    width: d.width * 0.88,
    height: d.height * (1 - (s.top + s.bottom) / 100),
  };
  const factor =
    (Math.min(safe.width / sourceWidth, safe.height / sh) * s.scale) / 100;
  const width = sourceWidth * factor,
    height = sh * factor;
  return {
    device: d,
    safe,
    sx: 0,
    sy,
    sw: sourceWidth,
    sh,
    x: safe.x + (safe.width - width) / 2,
    y: safe.y + ((safe.height - height) * (s.position + 100)) / 200,
    width,
    height,
  };
}
export function renderWallpaper(
  canvas: HTMLCanvasElement,
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  s: Settings,
) {
  const g = geometry(sourceWidth, sourceHeight, s);
  canvas.width = g.device.width;
  canvas.height = g.device.height;
  const ctx = canvas.getContext('2d');
  if (!ctx)
    throw new Error(
      '画像を作成できませんでした。別のブラウザでお試しください。',
    );
  renderBackground(ctx, canvas.width, canvas.height, s.color, s.pattern);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, g.sx, g.sy, g.sw, g.sh, g.x, g.y, g.width, g.height);
  return g;
}
// One restrained, opaque ink color, derived only from the selected background.
export function patternColor(color: string): string {
  const target = needsLightGuides(color) ? 255 : 0;
  return (
    '#' +
    [1, 3, 5]
      .map((i) => {
        const channel = parseInt(color.slice(i, i + 2), 16);
        return Math.round(channel * 0.86 + target * 0.14)
          .toString(16)
          .padStart(2, '0');
      })
      .join('')
  );
}
export function renderBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  color: string,
  pattern: Pattern,
) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
  if (pattern === 'solid') return;
  ctx.save();
  ctx.fillStyle = ctx.strokeStyle = patternColor(color);
  const unit = width / 1179;
  const gap = 72 * unit;
  ctx.lineWidth = 3 * unit;
  if (pattern === 'stripes' || pattern === 'diagonal') {
    ctx.beginPath();
    for (let x = pattern === 'diagonal' ? -height : 0; x <= width; x += gap) {
      ctx.moveTo(x, 0);
      ctx.lineTo(pattern === 'diagonal' ? x + height : x, height);
    }
    ctx.stroke();
  } else {
    const spacing = (pattern === 'stars' ? 128 : 88) * unit;
    for (let row = 0, y = spacing / 2; y < height; row++, y += spacing) {
      for (
        let x = spacing / 2 + ((row % 2) * spacing) / 2;
        x < width;
        x += spacing
      ) {
        ctx.beginPath();
        if (pattern === 'dots') {
          ctx.arc(x, y, 6 * unit, 0, Math.PI * 2);
        } else {
          for (let point = 0; point < 10; point++) {
            const radius = (point % 2 ? 5 : 12) * unit;
            const angle = -Math.PI / 2 + (point * Math.PI) / 5;
            const px = x + Math.cos(angle) * radius,
              py = y + Math.sin(angle) * radius;
            if (point === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
        }
        ctx.fill();
      }
    }
  }
  ctx.restore();
}
export function makeSample() {
  const canvas = document.createElement('canvas');
  canvas.width = 780;
  canvas.height = 950;
  const c = canvas.getContext('2d');
  if (!c) throw new Error('プレビューを表示できません。');
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 780, 950);
  c.fillStyle = '#728071';
  c.font = '24px Arial';
  c.fillText('NOTE TO SELF', 75, 106);
  c.fillStyle = '#26302c';
  c.font = '600 68px sans-serif';
  c.fillText('今日も、', 70, 295);
  c.fillText('自分のペースで。', 70, 405);
  c.fillStyle = '#d0e5ab';
  c.fillRect(75, 485, 105, 9);
  c.fillStyle = '#6a786e';
  c.font = '35px sans-serif';
  c.fillText('小さな一歩も、', 75, 610);
  c.fillText('ちゃんと前進。', 75, 675);
  c.fillStyle = '#8b978d';
  c.font = '20px Arial';
  c.fillText('SAMPLE SCREENSHOT', 75, 855);
  return canvas;
}
export function validateSettings(input: unknown): Partial<Settings> {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('設定はオブジェクトで指定してください。');
  const patch = input as Record<string, unknown>;
  const limits: Record<string, [number, number]> = {
    top: [8, 50],
    bottom: [8, 30],
    scale: [40, 100],
    position: [-100, 100],
    cropTop: [0, 40],
    cropBottom: [0, 40],
  };
  for (const [k, v] of Object.entries(patch)) {
    if (k === 'deviceId') {
      if (!DEVICES.some((d) => d.id === v))
        throw new Error('対応する機種を選んでください。');
    } else if (k === 'pattern') {
      if (!PATTERNS.some((p) => p.id === v))
        throw new Error('対応する背景の模様を選んでください。');
    } else if (k === 'color') {
      if (typeof v !== 'string' || !/^#[0-9a-f]{6}$/i.test(v))
        throw new Error('背景色は6桁のカラーコードで指定してください。');
    } else if (
      !limits[k] ||
      typeof v !== 'number' ||
      !Number.isFinite(v) ||
      v < limits[k][0] ||
      v > limits[k][1]
    )
      throw new Error(`設定範囲外: ${k}`);
  }
  return patch as Partial<Settings>;
}

export function needsLightGuides(color: string): boolean {
  const channels = [1, 3, 5].map(
    (i) => parseInt(color.slice(i, i + 2), 16) / 255,
  );
  const linear = channels.map((c) =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2] < 0.28;
}
