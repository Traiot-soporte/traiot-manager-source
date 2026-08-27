import { useCallback, useEffect, useRef } from 'react'

const confirmationMessage =
  'Se va a cancelar la operación y perderás los cambios sin guardar. ¿Deseas salir?'

export function useUnsavedChangesPrompt(active: boolean) {
  const allowNavigationRef = useRef(false)

  useEffect(() => {
    if (!active) return

    const confirmLinkNavigation = (event: MouseEvent) => {
      if (allowNavigationRef.current || event.defaultPrevented || event.button !== 0) return
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
      const target = event.target
      if (!(target instanceof Element)) return
      const anchor = target.closest('a[href]')
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === '_blank' || anchor.hasAttribute('download')) return
      if (anchor.href === window.location.href) return

      if (window.confirm(confirmationMessage)) {
        allowNavigationRef.current = true
        return
      }
      event.preventDefault()
      event.stopImmediatePropagation()
    }
    const confirmPageExit = (event: BeforeUnloadEvent) => {
      if (allowNavigationRef.current) return
      event.preventDefault()
      event.returnValue = ''
    }

    document.addEventListener('click', confirmLinkNavigation, true)
    window.addEventListener('beforeunload', confirmPageExit)
    return () => {
      document.removeEventListener('click', confirmLinkNavigation, true)
      window.removeEventListener('beforeunload', confirmPageExit)
    }
  }, [active])

  return {
    allowNavigation: useCallback(() => { allowNavigationRef.current = true }, []),
    protectNavigation: useCallback(() => { allowNavigationRef.current = false }, []),
  }
}
