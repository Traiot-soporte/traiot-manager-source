import { readFile, writeFile } from 'node:fs/promises'

const source = await readFile(
  new URL('../node_modules/bcryptjs/umd/index.js', import.meta.url),
  'utf8',
)
const notice = `/**
 * ARCHIVO GENERADO. No editar manualmente.
 * bcryptjs 3.0.2, licencia BSD-3-Clause.
 * Fuente: node_modules/bcryptjs/umd/index.js
 */
var bcryptSetTimeout_ = typeof setTimeout === 'function'
  ? setTimeout
  : function (callback) { callback(); };
`

await writeFile(
  new URL('../apps-script/82_Bcrypt.gs', import.meta.url),
  notice + source
    .replace('// GENERATED FILE. DO NOT EDIT.\n', '')
    .replace(': setTimeout;', ': bcryptSetTimeout_;'),
  'utf8',
)
