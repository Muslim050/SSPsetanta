import { useEffect } from 'react'
import { getRouteApi } from '@tanstack/react-router'

const route = getRouteApi('/watch')

/**
 * Ролик в отдельной вкладке. Прямая ссылка на файл не годится: хранилище
 * отдаёт его вложением (`Content-Disposition: attachment`), и браузер
 * вместо показа скачивает. Плееру `<video>` вложение не мешает.
 */
export default function Watch() {
  const { src, name } = route.useSearch()

  useEffect(() => {
    document.title = name || 'Ролик'
  }, [name])

  if (!src) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-sm text-white/60">
        Ролик не найден
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <video
        src={src}
        controls
        autoPlay
        playsInline
        className="max-h-screen w-full"
      />
    </div>
  )
}
