import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const distDirectory = resolve('dist')
const sourcePath = resolve(distDirectory, 'index.html')
const targetPath = resolve('apps-script', 'Index.html')
let html = readFileSync(sourcePath, 'utf8')
const favicon = readFileSync(resolve(distDirectory, 'favicon.svg'), 'utf8')
const faviconDataUri = `data:image/svg+xml,${encodeURIComponent(favicon)}`

html = html.replace(
  /href="[^"]*favicon\.svg"/g,
  `href="${faviconDataUri}"`,
)

html = html.replace(
  /<link rel="stylesheet" crossorigin href="([^"]+)">/g,
  (_match, assetPath: string) => {
    const css = readFileSync(resolveAssetPath(assetPath), 'utf8')
    return `<style>\n${css.replace(/<\/style/gi, '<\\/style')}\n</style>`
  },
)

html = html.replace(
  /<script type="module" crossorigin src="([^"]+)"><\/script>/g,
  (_match, assetPath: string) => {
    const javascript = readFileSync(resolveAssetPath(assetPath), 'utf8')
    return `<script type="module">\n${javascript.replace(/<\/script/gi, '<\\/script')}\n</script>`
  },
)

html = html.replace('<head>', '<head>\n    <base target="_top" />')
html = html.replace(/[ \t]+$/gm, '')
writeFileSync(targetPath, html, 'utf8')

function resolveAssetPath(assetPath: string): string {
  return resolve(distDirectory, assetPath.replace(/^\//, ''))
}
