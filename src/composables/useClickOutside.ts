import { onUnmounted, watch, type Ref } from 'vue'

export function useClickOutside(
  elementRef: Ref<HTMLElement | null>,
  active: Ref<boolean> | (() => boolean),
  onOutside: () => void,
  options?: { ignoreRefs?: Ref<HTMLElement | null>[] },
) {
  function handler(e: MouseEvent) {
    const target = e.target as Node
    if (elementRef.value && !elementRef.value.contains(target)) {
      if (options?.ignoreRefs?.some((r) => r.value?.contains(target))) return
      onOutside()
    }
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onOutside()
  }

  const isActive = typeof active === 'function' ? active : () => active.value

  watch(
    isActive,
    (val) => {
      if (val) {
        document.addEventListener('mousedown', handler)
        document.addEventListener('keydown', onKeydown)
      } else {
        document.removeEventListener('mousedown', handler)
        document.removeEventListener('keydown', onKeydown)
      }
    },
    { immediate: true },
  )

  onUnmounted(() => {
    document.removeEventListener('mousedown', handler)
    document.removeEventListener('keydown', onKeydown)
  })
}
