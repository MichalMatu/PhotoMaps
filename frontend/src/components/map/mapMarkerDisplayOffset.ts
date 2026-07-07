export type MarkerDisplayOffset = {
  x: number;
  y: number;
};

export function placeMarkerOffsetStyle(offset: MarkerDisplayOffset | null | undefined) {
  const x = Math.round(offset?.x ?? 0);
  const y = Math.round(offset?.y ?? 0);

  return `--place-marker-offset-x: ${x}px; --place-marker-offset-y: ${y}px;`;
}
