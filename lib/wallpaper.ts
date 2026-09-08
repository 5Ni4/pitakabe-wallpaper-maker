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
export type Settings = {
  deviceId: string;
  top: number;
  bottom: number;
  scale: number;
  position: number;
  cropTop: number;
  cropBottom: number;
  color: string;
};
export const DEFAULTS: Settings = {
  deviceId: '16',
  top: 32,
  bottom: 18,
  scale: 100,
  position: 0,
  cropTop: 0,
  cropBottom: 0,
  color: '#e4eaf5',
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
  ctx.fillStyle = s.color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, g.sx, g.sy, g.sw, g.sh, g.x, g.y, g.width, g.height);
  return g;
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
