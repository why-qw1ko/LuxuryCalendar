const RGB_HEX = /^#(?:[0-9a-f]{6})$/i

export function normalizeHex(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (/^#[0-9a-f]{3}$/i.test(trimmed)) return `#${[...trimmed.slice(1)].map(char => char + char).join('')}`.toUpperCase()
  return RGB_HEX.test(trimmed) ? trimmed.toUpperCase() : null
}
function rgb(hex) { return [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16)) }
function hex(channels) { return `#${channels.map(value => Math.round(value).toString(16).padStart(2, '0')).join('')}`.toUpperCase() }
function mix(a, b, amount) { return a.map((value, index) => value + (b[index] - value) * amount) }
function luminance(channels) {
  const [r, g, b] = channels.map(value => { const c = value / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export function contrastRatio(foreground, background) {
  const a = luminance(rgb(foreground)); const b = luminance(rgb(background))
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}
function ensureContrast(color, surface, target, toward) {
  const channels = rgb(color)
  let result = color
  for (let step = 1; contrastRatio(result, surface) < target && step <= 100; step++) result = hex(mix(channels, toward, step / 100))
  return result
}
export function buildTheme(value, dark = false) {
  const original = normalizeHex(value) || '#165DFF'
  const surface = dark ? '#232324' : '#FFFFFF'
  // Preserve the chosen hue where possible and adjust only when text contrast is insufficient.
  const accent = ensureContrast(original, surface, 4.5, dark ? [255, 255, 255] : [0, 0, 0])
  const accentRgb = rgb(accent)
  const onAccent = contrastRatio('#FFFFFF', accent) >= contrastRatio('#101010', accent) ? '#FFFFFF' : '#101010'
  const control = ensureContrast(accent, '#FFFFFF', 3, [0, 0, 0])
  const soft = hex(mix(accentRgb, rgb(surface), dark ? 0.82 : 0.90))
  const border = hex(mix(accentRgb, rgb(surface), dark ? 0.35 : 0.55))
  const palette = {}
  for (let i = 1; i <= 10; i++) {
    const channels = i < 6 ? mix(rgb(surface), accentRgb, i / 6) : i === 6 ? accentRgb : mix(accentRgb, dark ? [255, 255, 255] : [0, 0, 0], (i - 6) * 0.1)
    palette[`--primary-${i}`] = channels.map(Math.round).join(', ')
  }
  return { original, accent, onAccent, control, soft, border, adjusted: accent !== original, palette }
}
