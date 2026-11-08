// DOM rectangles and pointer client coordinates share CSS pixels, including
// Electron's page zoom. Keeping them in that space avoids double-scaling.
export function pointerGaze(rect, pointer) {
  const range = Math.max(rect.width, 1) * 2;
  const clamp = value => Math.max(-1, Math.min(1, value));
  return [
    clamp((pointer.x - rect.x - rect.width / 2) / range),
    clamp(-(pointer.y - rect.y - rect.height / 2) / range),
  ];
}
