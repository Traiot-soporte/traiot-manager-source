import { useEffect, useState } from 'react'

export function useNearViewport<T extends Element>(rootMargin = '320px') {
  const [element, observe] = useState<T | null>(null)
  const [isNearViewport, setIsNearViewport] = useState(
    () => typeof IntersectionObserver === 'undefined',
  )

  useEffect(() => {
    if (!element || isNearViewport) return

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      setIsNearViewport(true)
      observer.disconnect()
    }, { rootMargin })

    observer.observe(element)
    return () => observer.disconnect()
  }, [element, isNearViewport, rootMargin])

  return { isNearViewport, observe } as const
}
