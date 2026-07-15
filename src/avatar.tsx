import type { Mentee } from './data'

// Avatar do mentorado: foto de perfil quando houver, senão as iniciais.
// Usa as mesmas dimensões/estilo do .avatar existente.
export function Avatar({ m, size = 46, fontSize = 15 }: {
  m: Pick<Mentee, 'initials' | 'name'> & { photo?: string }
  size?: number
  fontSize?: number
}) {
  return m.photo
    ? <img className="avatar avatar-photo" src={m.photo} alt={m.name} style={{ width: size, height: size }} />
    : <div className="avatar" style={{ width: size, height: size, fontSize }}>{m.initials}</div>
}

// Redimensiona a foto no navegador antes de guardar (quadrada, JPEG leve).
// Resultado típico: 15–35 KB — cabe tranquilo no registro do mentorado.
export function resizePhoto(file: File, max = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > 10 * 1024 * 1024) return reject(new Error('Foto acima de 10 MB.'))
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const side = Math.min(img.width, img.height)
      const sx = (img.width - side) / 2, sy = (img.height - side) / 2 // crop central quadrado
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = Math.min(max, side)
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('Não foi possível processar a imagem.'))
      ctx.drawImage(img, sx, sy, side, side, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Arquivo não é uma imagem válida.')) }
    img.src = url
  })
}
