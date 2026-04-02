import { onUnmounted, ref as vueRef, watch, type Ref } from 'vue'

interface PageMeta {
  title?: Ref<string | undefined> | string
  description?: Ref<string | undefined> | string
  image?: Ref<string | undefined> | string
  url?: Ref<string | undefined> | string
  type?: string
}

function toRef(val: Ref<string | undefined> | string | undefined): Ref<string | undefined> {
  if (val === undefined) return vueRef(undefined)
  if (typeof val === 'string') return vueRef(val)
  return val
}

const SITE_URL = window.location.origin

const DEFAULT_TITLE = 'AccSaber Reloaded'
const DEFAULT_DESCRIPTION = 'Accuracy-based leaderboard platform for Beat Saber.'
const DEFAULT_IMAGE = `${SITE_URL}/icon-512x512.png`

function setMeta(property: string, content: string) {
  let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('property', property)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setNameMeta(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('name', name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function applyMeta(meta: { title: string; description: string; image: string; url: string; type: string }) {
  document.title = meta.title

  setMeta('og:title', meta.title)
  setMeta('og:description', meta.description)
  setMeta('og:image', meta.image)
  setMeta('og:url', meta.url)
  setMeta('og:type', meta.type)

  setNameMeta('description', meta.description)
  setNameMeta('twitter:card', 'summary_large_image')
  setNameMeta('twitter:title', meta.title)
  setNameMeta('twitter:description', meta.description)
  setNameMeta('twitter:image', meta.image)
}

export function usePageMeta(meta: PageMeta) {
  const type = meta.type ?? 'website'
  const titleRef = toRef(meta.title)
  const descriptionRef = toRef(meta.description)
  const imageRef = toRef(meta.image)
  const urlRef = toRef(meta.url)

  function update() {
    applyMeta({
      title: titleRef.value ?? DEFAULT_TITLE,
      description: descriptionRef.value ?? DEFAULT_DESCRIPTION,
      image: imageRef.value ?? DEFAULT_IMAGE,
      url: urlRef.value ?? window.location.href,
      type,
    })
  }

  const refs = [titleRef, descriptionRef, imageRef, urlRef]
  watch(refs, update, { immediate: true })

  onUnmounted(() => {
    applyMeta({
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      image: DEFAULT_IMAGE,
      url: SITE_URL,
      type: 'website',
    })
  })
}
