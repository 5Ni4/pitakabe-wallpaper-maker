// Encode an isolated snapshot. Never present an outdated PNG after the user edits.
export async function encodeCurrentPng(
  canvas: Pick<HTMLCanvasElement, 'toBlob'>,
  isCurrent: () => boolean,
): Promise<Blob | null> {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png'),
  );
  if (!isCurrent()) return null;
  if (!blob)
    throw new Error('書き出しに失敗しました。もう一度お試しください。');
  return blob;
}
