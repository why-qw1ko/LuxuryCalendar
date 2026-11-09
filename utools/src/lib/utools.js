export function registerUtoolsLifecycle(utools, setActive) {
  if (!utools) return false
  utools.onPluginEnter(({ code }) => { if (code === 'calendar') setActive(true) })
  utools.onPluginOut(() => setActive(false))
  return true
}
