import exo2RegularUrl from '@fontsource/exo-2/files/exo-2-latin-400-normal.woff2?url'
import exo2MediumUrl from '@fontsource/exo-2/files/exo-2-latin-500-normal.woff2?url'
import exo2SemiBoldUrl from '@fontsource/exo-2/files/exo-2-latin-600-normal.woff2?url'
import exo2BoldUrl from '@fontsource/exo-2/files/exo-2-latin-700-normal.woff2?url'
import exo2ExtraBoldUrl from '@fontsource/exo-2/files/exo-2-latin-800-normal.woff2?url'
import exo2BlackUrl from '@fontsource/exo-2/files/exo-2-latin-900-normal.woff2?url'

export const EXO_2_FONT_FAMILY = '"Exo 2", sans-serif'

export const EXO_2_FONT_FACE_CSS = [
  fontFace(400, exo2RegularUrl),
  fontFace(500, exo2MediumUrl),
  fontFace(600, exo2SemiBoldUrl),
  fontFace(700, exo2BoldUrl),
  fontFace(800, exo2ExtraBoldUrl),
  fontFace(900, exo2BlackUrl),
].join('')

function fontFace(weight: number, source: string): string {
  return `@font-face{font-family:"Exo 2";font-style:normal;font-display:swap;font-weight:${String(weight)};src:url("${source}") format("woff2")}`
}
