<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

const props = defineProps<{
  particleCount?: number
  proximityRadius?: number
  darkMode?: boolean
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
let rafId: number | null = null
let particles: Star[] = []
let mouseX = -1000
let mouseY = -1000
let isVisible = true
let startTime = 0

interface Star {
  x: number
  y: number
  baseOpacity: number
  size: number
  twinkleSpeed: number  
  twinklePhase: number
  twinkleDepth: number
  warm: boolean
  bright: boolean
}

const count = props.particleCount ?? 120
const radius = props.proximityRadius ?? 120

function isReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function isMobile(): boolean {
  return window.innerWidth < 768
}

function initParticles(w: number, h: number) {
  particles = []
  for (let i = 0; i < count; i++) {
    const y = Math.random() * h
    const yRatio = 1 - y / h
    const isBright = Math.random() < 0.16
    const isWarm = Math.random() < (yRatio * 0.5) 

    particles.push({
      x: Math.random() * w,
      y,
      baseOpacity: isBright
        ? 0.3 + Math.random() * 0.3
        : 0.04 + Math.random() * 0.08,
      size: isBright
        ? 2 + Math.random() * 1.5
        : 1 + Math.random() * 1.5,
      twinkleSpeed: 0.5 + Math.random() * 2.5,
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleDepth: isBright
        ? 0.6 + Math.random() * 0.4
        : 0.3 + Math.random() * 0.4,
      warm: isWarm,
      bright: isBright,
    })
  }
}

function drawCrossSpike(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  opacity: number,
  warm: boolean,
) {
  const dark = props.darkMode !== false
  const r = dark ? (warm ? 255 : 232) : (warm ? 80 : 40)
  const g = dark ? (warm ? 220 : 232) : (warm ? 60 : 40)
  const b = dark ? (warm ? 150 : 240) : (warm ? 20 : 60)
  const spikeLen = size * 3.5

  const hGrad = ctx.createLinearGradient(x - spikeLen, y, x + spikeLen, y)
  hGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`)
  hGrad.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${opacity * 0.3})`)
  hGrad.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${opacity * 0.7})`)
  hGrad.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, ${opacity * 0.3})`)
  hGrad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)

  ctx.beginPath()
  ctx.moveTo(x - spikeLen, y)
  ctx.lineTo(x, y - 0.5)
  ctx.lineTo(x + spikeLen, y)
  ctx.lineTo(x, y + 0.5)
  ctx.closePath()
  ctx.fillStyle = hGrad
  ctx.fill()

  const vGrad = ctx.createLinearGradient(x, y - spikeLen, x, y + spikeLen)
  vGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`)
  vGrad.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${opacity * 0.3})`)
  vGrad.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${opacity * 0.7})`)
  vGrad.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, ${opacity * 0.3})`)
  vGrad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)

  ctx.beginPath()
  ctx.moveTo(x, y - spikeLen)
  ctx.lineTo(x - 0.5, y)
  ctx.lineTo(x, y + spikeLen)
  ctx.lineTo(x + 0.5, y)
  ctx.closePath()
  ctx.fillStyle = vGrad
  ctx.fill()
}

function draw(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
  ctx.clearRect(0, 0, w, h)

  const mobile = isMobile()
  const reduced = isReducedMotion()
  const elapsed = (time - startTime) / 1000

  for (const p of particles) {
    let twinkle = 1
    if (!reduced) {
      const wave = Math.sin(elapsed * p.twinkleSpeed + p.twinklePhase)
      twinkle = 1 - p.twinkleDepth * 0.5 * (1 - wave)
    }

    let opacity = p.baseOpacity * twinkle
    let size = p.size

    let proximityFactor = 0
    if (!mobile && !reduced) {
      const dx = p.x - mouseX
      const dy = p.y - mouseY
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < radius) {
        proximityFactor = 1 - dist / radius
        proximityFactor = proximityFactor * proximityFactor * (3 - 2 * proximityFactor)
        opacity = opacity + (0.7 - opacity) * proximityFactor
        size = size + (4.5 - size) * proximityFactor
      }
    }

    const dark = props.darkMode !== false
    const baseR = dark ? (p.warm ? 255 : 232) : (p.warm ? 80 : 40)
    const baseG = dark ? (p.warm ? 220 : 232) : (p.warm ? 60 : 40)
    const baseB = dark ? (p.warm ? 150 : 240) : (p.warm ? 20 : 60)
    const cursorR = dark ? 255 : 60
    const cursorG = dark ? 215 : 50
    const cursorB = dark ? 120 : 10
    const r = Math.round(baseR + (cursorR - baseR) * proximityFactor)
    const g = Math.round(baseG + (cursorG - baseG) * proximityFactor)
    const b = Math.round(baseB + (cursorB - baseB) * proximityFactor)

    const showGlow = (p.bright && opacity > 0.15) || proximityFactor > 0.3
    if (showGlow) {
      const glowSize = size * (proximityFactor > 0.3 ? 5 : 4)
      const glowOpacity = proximityFactor > 0.3
        ? opacity * (0.15 + 0.2 * proximityFactor)
        : opacity * 0.25
      const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowSize)
      grd.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${glowOpacity})`)
      grd.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${glowOpacity * 0.25})`)
      grd.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)
      ctx.beginPath()
      ctx.arc(p.x, p.y, glowSize, 0, Math.PI * 2)
      ctx.fillStyle = grd
      ctx.fill()
    }

    const showSpike = (p.bright && twinkle > 0.85) || proximityFactor > 0.6
    if (showSpike) {
      const spikeIntensity = proximityFactor > 0.6
        ? opacity * proximityFactor * 0.8
        : opacity * (twinkle - 0.85) / 0.15
      drawCrossSpike(ctx, p.x, p.y, size, spikeIntensity, proximityFactor > 0.3 || p.warm)
    }

    ctx.beginPath()
    ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`
    ctx.fill()
  }
}

function loop(time: number) {
  if (!isVisible || !canvasRef.value) return
  const ctx = canvasRef.value.getContext('2d')
  if (!ctx) return
  const dpr = Math.min(window.devicePixelRatio, 2)

  draw(ctx, canvasRef.value.width / dpr, canvasRef.value.height / dpr, time)
  rafId = requestAnimationFrame(loop)
}

function onMouseMove(e: MouseEvent) {
  if (!canvasRef.value) return
  const rect = canvasRef.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  if (x >= -radius && x <= rect.width + radius && y >= -radius && y <= rect.height + radius) {
    mouseX = x
    mouseY = y
  } else {
    mouseX = -1000
    mouseY = -1000
  }
}

function onVisibility() {
  isVisible = !document.hidden
  if (isVisible && !rafId) {
    rafId = requestAnimationFrame(loop)
  }
}

function resize() {
  if (!canvasRef.value) return
  const parent = canvasRef.value.parentElement
  if (!parent) return
  const dpr = Math.min(window.devicePixelRatio, 2)
  const w = parent.clientWidth + 120
  const h = parent.clientHeight + 120
  canvasRef.value.width = w * dpr
  canvasRef.value.height = h * dpr
  canvasRef.value.style.width = w + 'px'
  canvasRef.value.style.height = h + 'px'
  const ctx = canvasRef.value.getContext('2d')
  if (ctx) ctx.scale(dpr, dpr)
  initParticles(w, h)
}

onMounted(() => {
  resize()
  startTime = performance.now()

  if (isReducedMotion()) {
    const ctx = canvasRef.value?.getContext('2d')
    if (ctx && canvasRef.value) {
      const dpr = Math.min(window.devicePixelRatio, 2)
      draw(ctx, canvasRef.value.width / dpr, canvasRef.value.height / dpr, startTime)
    }
    return
  }

  rafId = requestAnimationFrame(loop)

  window.addEventListener('resize', resize)
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('mousemove', onMouseMove)
})

onUnmounted(() => {
  if (rafId !== null) cancelAnimationFrame(rafId)
  window.removeEventListener('resize', resize)
  document.removeEventListener('visibilitychange', onVisibility)
  window.removeEventListener('mousemove', onMouseMove)
})
</script>

<template>
  <canvas ref="canvasRef" class="particle-canvas" />
</template>

<style scoped>
.particle-canvas {
  position: absolute;
  max-width: none;
  inset: -40px -60px -80px -60px;
  pointer-events: none;
  z-index: 0;
  -webkit-mask-image:
    linear-gradient(to bottom, transparent 0%, white 5%, white 65%, transparent 100%),
    linear-gradient(to right, transparent 0%, white 8%, white 92%, transparent 100%);
  -webkit-mask-composite: destination-in;
  mask-image:
    linear-gradient(to bottom, transparent 0%, white 5%, white 65%, transparent 100%),
    linear-gradient(to right, transparent 0%, white 8%, white 92%, transparent 100%);
  mask-composite: intersect;
}
</style>
