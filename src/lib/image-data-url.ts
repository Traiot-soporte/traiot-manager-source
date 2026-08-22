const maximumSide = 1920
const directUploadLimit = 2 * 1024 * 1024
const inputLimit = 25 * 1024 * 1024

export async function prepareImageDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Selecciona un archivo de imagen.')
  }

  if (file.size > inputLimit) {
    throw new Error('La imagen original excede 25 MB.')
  }

  const original = await readAsDataUrl(file)
  const image = await loadImage(original)

  if (Math.max(image.naturalWidth, image.naturalHeight) <= maximumSide && file.size <= directUploadLimit) {
    return original
  }

  const scale = Math.min(1, maximumSide / Math.max(image.naturalWidth, image.naturalHeight))
  const width = Math.max(1, Math.round(image.naturalWidth * scale))
  const height = Math.max(1, Math.round(image.naturalHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('El navegador no pudo preparar la imagen.')
  }

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.drawImage(image, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', 0.82)
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('No fue posible leer la imagen.'))
    })
    reader.addEventListener('error', () => reject(new Error('No fue posible leer la imagen.')))
    reader.readAsDataURL(file)
  })
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', () => reject(new Error('La imagen seleccionada esta dañada.')))
    image.src = source
  })
}
