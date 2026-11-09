<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { CalendarDays, CalendarRange, ChevronLeft, ChevronRight, Clock3, Globe2, History, LayoutGrid, Menu, Moon, PanelLeftClose, PanelLeftOpen, Settings2, Sun, X } from 'lucide-vue-next'
import { Alert as AAlert, ColorPicker as AColorPicker, Message, Modal as AModal, Select as ASelect, Spin as ASpin, Switch as ASwitch, Tag as ATag } from '@arco-design/web-vue'
import { Temporal } from '@js-temporal/polyfill'
import { addDays, addMonths, chineseInfo, dateKey, daysFromToday, formatDate, monthGrid, parseDate, todayIn, weekdays, weekStart } from './lib/calendar'
import { buildTheme, normalizeHex } from './lib/theme'
import { historyFor } from './lib/history'
import { fetchHistory, fetchHolidays } from './lib/remote'
import { officialHolidays } from './lib/official-holidays'

const presets = [
  { id: 'blue', name: '钴蓝', color: '#165DFF' }, { id: 'purple', name: '紫罗兰', color: '#7040BB' },
  { id: 'teal', name: '孔雀绿', color: '#087964' }, { id: 'red', name: '朱砂', color: '#BD3931' }, { id: 'slate', name: '石墨', color: '#46576F' }
]
const defaults = { zone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai', firstDay: 1, accent: 'blue', customColor: '#165DFF', mode: 'light', holidayCorner: 'top-right', snapToday: false, sidebarDefaultOpen: true, showSpotlight: true, showSidebar: true, showBrand: true, showViewNav: true, showLunar: true, showHoliday: true, showMini: true, showDate: true, showHistory: true, showZone: true, showDateTime: true }
function readSettings() { try { return JSON.parse(localStorage.getItem('daylight-settings')) || {} } catch { return {} } }
const saved = readSettings()
const settings = ref({ ...defaults, zone: saved.zone || defaults.zone, firstDay: [0, 1, 6].includes(saved.firstDay) ? saved.firstDay : 1, accent: saved.accent === 'custom' || presets.some(p => p.id === saved.accent) ? saved.accent : 'blue', customColor: normalizeHex(saved.customColor) || defaults.customColor, mode: saved.mode === 'dark' ? 'dark' : 'light', holidayCorner: ['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(saved.holidayCorner) ? saved.holidayCorner : defaults.holidayCorner, snapToday: saved.snapToday === true, sidebarDefaultOpen: saved.sidebarDefaultOpen !== false, showSpotlight: saved.showSpotlight !== false, showSidebar: saved.showSidebar !== false, showBrand: saved.showBrand !== false, showViewNav: saved.showViewNav !== false, showLunar: saved.showLunar !== false, showHoliday: saved.showHoliday !== false, showMini: saved.showMini !== false, showDate: saved.showDate !== false, showHistory: saved.showHistory !== false, showZone: saved.showZone !== false, showDateTime: saved.showDateTime !== false })
const sidebarContentKeys = ['showBrand', 'showViewNav', 'showMini']
if (!settings.value.showSidebar) sidebarContentKeys.forEach(key => { settings.value[key] = false })
else if (!sidebarContentKeys.some(key => settings.value[key])) settings.value.showSidebar = false
try { Temporal.Now.zonedDateTimeISO(settings.value.zone) } catch { settings.value.zone = defaults.zone }
const today = ref(todayIn(settings.value.zone))
const currentTime = ref(Date.now())
const timeFormatter = computed(() => new Intl.DateTimeFormat('zh-CN', { timeZone: settings.value.zone, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }))
const timeText = computed(() => timeFormatter.value.format(currentTime.value))
const current = ref(today.value)
const selected = ref(today.value)
const view = ref('month')
const modal = ref(false)
const pendingHistory = ref(false)
const mobileNav = ref(settings.value.sidebarDefaultOpen && window.matchMedia('(max-width: 680px)').matches)
const sidebarCollapsed = ref(!settings.value.sidebarDefaultOpen)
const storageError = ref(false)
const holidays = ref({})
const holidayStates = ref({})
const historyData = ref([])
const historyStatus = ref('loading')
const colorPickerChanged = ref(false)
const colorPickerOpen = ref(false)
const zoneSelectOpen = ref(false)
const weekSelectOpen = ref(false)
const cornerSelectOpen = ref(false)
const festivalTick = ref(0)
const floatPosition = ref(null)
const dragging = ref(false)
let dragState = null
let clickTimer = null
let festivalTimer
let spotlightFrame = null
let spotlightPointer = null
let litCells = new Set()
let previousFocus = null
let timer

watch(settings, value => { try { localStorage.setItem('daylight-settings', JSON.stringify(value)); storageError.value = false } catch { storageError.value = true } }, { deep: true })
watch(() => settings.value.showSidebar, show => { if (!show) mobileNav.value = false })
watch(() => settings.value.zone, () => { today.value = todayIn(settings.value.zone) })
watch(modal, async (open, wasOpen) => {
  if (open && !wasOpen) { previousFocus = document.activeElement; document.addEventListener('keydown', handleModalEscape, true) }
  if (!open && wasOpen) { document.removeEventListener('keydown', handleModalEscape, true); colorPickerOpen.value = false; zoneSelectOpen.value = false; weekSelectOpen.value = false; cornerSelectOpen.value = false; pendingHistory.value = false; await nextTick(); previousFocus?.focus?.() }
})
const baseColor = computed(() => settings.value.accent === 'custom' ? settings.value.customColor : presets.find(p => p.id === settings.value.accent)?.color || defaults.customColor)
const theme = computed(() => buildTheme(baseColor.value, settings.value.mode === 'dark'))
const themeStyles = computed(() => ({ '--accent': theme.value.accent, '--accent-on': theme.value.onAccent, '--accent-soft': theme.value.soft, '--accent-border': theme.value.border }))
watch([theme, () => settings.value.mode], ([colors, mode]) => {
  if (mode === 'dark') document.body.setAttribute('arco-theme', 'dark')
  else document.body.removeAttribute('arco-theme')
  for (const [name, value] of Object.entries({ ...colors.palette, ...themeStyles.value })) document.body.style.setProperty(name, value)
}, { immediate: true })
onMounted(() => { timer = setInterval(() => { currentTime.value = Date.now(); const date = todayIn(settings.value.zone); if (!date.equals(today.value)) today.value = date }, 1000); festivalTimer = setInterval(() => { festivalTick.value++ }, 4000); window.addEventListener('resize', clampFloatPosition) })
onUnmounted(() => { clearInterval(timer); clearInterval(festivalTimer); clearTimeout(clickTimer); clearSpotlight(); window.removeEventListener('resize', clampFloatPosition); document.removeEventListener('keydown', handleModalEscape, true); document.body.removeAttribute('arco-theme'); for (const name of [...Object.keys(theme.value.palette), ...Object.keys(themeStyles.value)]) document.body.style.removeProperty(name) })

const days = computed(() => view.value === 'month' ? monthGrid(current.value, settings.value.firstDay) : view.value === 'week' ? Array.from({ length: 7 }, (_, i) => addDays(weekStart(current.value, settings.value.firstDay), i)) : [current.value])
const labels = computed(() => Array.from({ length: 7 }, (_, i) => weekdays[(settings.value.firstDay + i) % 7]))
const years = Array.from({ length: 201 }, (_, i) => 1900 + i)
const yearOptions = years.map(year => ({ label: `${year}年`, value: year }))
const monthOptions = Array.from({ length: 12 }, (_, i) => ({ label: `${i + 1}月`, value: i + 1 }))
const firstDayOptions = [{ label: '星期一', value: 1 }, { label: '星期日', value: 0 }, { label: '星期六', value: 6 }]
const cornerOptions = [{ label: '左上角', value: 'top-left' }, { label: '右上角', value: 'top-right' }, { label: '左下角', value: 'bottom-left' }, { label: '右下角', value: 'bottom-right' }]
const modules = [{ key: 'showSpotlight', label: '日历动效' }, { key: 'showSidebar', label: '侧边栏' }, { key: 'showBrand', label: '侧边栏标题' }, { key: 'showViewNav', label: '侧边栏视图导航' }, { key: 'showMini', label: '侧边小日历' }, { key: 'showDate', label: '日期详情' }, { key: 'showHistory', label: '历史上的今天' }, { key: 'showZone', label: '时区标识' }, { key: 'showDateTime', label: '右上时间日期' }, { key: 'showLunar', label: '农历与节气' }, { key: 'showHoliday', label: '节假日调休' }]
const inputLabelObservers = new WeakMap()
const vInputLabel = {
  mounted(element, binding) {
    const apply = () => element.querySelector('input')?.setAttribute('aria-label', binding.value)
    apply()
    const observer = new MutationObserver(apply)
    observer.observe(element, { childList: true, subtree: true })
    inputLabelObservers.set(element, observer)
  },
  beforeUnmount(element) { inputLabelObservers.get(element)?.disconnect(); inputLabelObservers.delete(element) }
}
const title = computed(() => view.value === 'month' ? `${current.value.year}年 ${current.value.month}月` : view.value === 'week' ? `${formatDate(days.value[0], { year: 'numeric', month: 'long', day: 'numeric' })} – ${formatDate(days.value[6], { year: 'numeric', month: 'long', day: 'numeric' })}` : formatDate(current.value, { year: 'numeric', month: 'long', day: 'numeric' }))
const miniDays = computed(() => monthGrid(current.value, settings.value.firstDay))
const zones = computed(() => [...new Set([settings.value.zone, 'Asia/Shanghai', 'UTC', ...(Intl.supportedValuesOf?.('timeZone') || ['Asia/Tokyo', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'Australia/Sydney'])])])
const info = computed(() => dayInfo(selected.value))
const relativeDays = computed(() => daysFromToday(selected.value, today.value))
const relativeText = computed(() => relativeDays.value === 0 ? '今天' : `距今天 ${Math.abs(relativeDays.value)} 天${relativeDays.value > 0 ? '后' : '前'}`)
const history = computed(() => historyStatus.value === 'ready' ? historyData.value : historyFor(selected.value))
const yearStatus = computed(() => holidayStates.value[current.value.year] || 'loading')
const holidayStatus = computed(() => ({ unavailable: '节假日数据未覆盖', loading: '节假日数据加载中' })[yearStatus.value] || '')
function dayInfo(day) {
  const base = chineseInfo(day)
  const year = holidays.value[day.year]
  return { ...base, holiday: year ? year[dateKey(day)] || null : null }
}
function dayObservances(day) { const info = dayInfo(day); return [...new Set([info.term, ...(info.festivals || [])].filter(Boolean))] }
function dayText(day) { const labels = dayObservances(day); return labels.length ? labels[festivalTick.value % labels.length] : dayInfo(day).lunar }
function dayLabel(day) {
  const info = dayInfo(day)
  const observances = [...new Set([info.term, ...(info.festivals || [])].filter(Boolean))]
  return [formatDate(day, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }), settings.value.showLunar ? (observances.join('、') || info.lunar) : '', settings.value.showHoliday && info.holiday ? `${info.holiday.name} ${info.holiday.work ? '调休上班' : '放假'}` : ''].filter(Boolean).join('，')
}
watch(() => settings.value.showHoliday ? [...new Set([...days.value, ...miniDays.value].map(day => day.year))].join(',') : '', (years, _, onCleanup) => {
  const controller = new AbortController()
  onCleanup(() => controller.abort())
  if (!years) return
  for (const year of years.split(',').map(Number)) {
    if (year < 1900 || year > 2100 || holidays.value[year]) continue
    holidayStates.value = { ...holidayStates.value, [year]: 'loading' }
    fetchHolidays(year, controller.signal).then(data => {
      if (!controller.signal.aborted) { holidays.value = { ...holidays.value, [year]: data }; holidayStates.value = { ...holidayStates.value, [year]: 'remote' } }
    }).catch(() => { if (!controller.signal.aborted) { if (officialHolidays[year]) { holidays.value = { ...holidays.value, [year]: officialHolidays[year] }; holidayStates.value = { ...holidayStates.value, [year]: 'official' } } else holidayStates.value = { ...holidayStates.value, [year]: 'unavailable' } } })
  }
}, { immediate: true })
watch(() => [selected.value.toString(), settings.value.showHistory], async ([, show], __, onCleanup) => {
  if (!show) return
  const controller = new AbortController(); onCleanup(() => controller.abort())
  historyStatus.value = 'loading'; historyData.value = []
  try { const data = await fetchHistory(selected.value, controller.signal); if (!controller.signal.aborted) { historyData.value = data; historyStatus.value = 'ready' } }
  catch { if (!controller.signal.aborted) historyStatus.value = 'offline' }
}, { immediate: true })
function choose(day) {
  if (day.year < 1900 || day.year > 2100) return
  selected.value = day
  current.value = day
}
function changePeriod(part, selection) {
  const value = Number(selection)
  if (!Number.isInteger(value) || (part === 'year' ? value < 1900 || value > 2100 : value < 1 || value > 12)) return
  const date = current.value.with({ [part]: value }, { overflow: 'constrain' })
  current.value = date; selected.value = date
}
function moveMini(amount) { const next = addMonths(current.value, amount); if (next.year >= 1900 && next.year <= 2100) { current.value = next; selected.value = next } }
function move(amount) { const next = view.value === 'month' ? addMonths(current.value, amount) : addDays(current.value, amount * (view.value === 'week' ? 7 : 1)); if (next.year >= 1900 && next.year <= 2100) { current.value = next; selected.value = next } }
function goToday() { today.value = todayIn(settings.value.zone); current.value = today.value; selected.value = today.value }
function clampFloatPosition() {
  if (!floatPosition.value) return
  floatPosition.value = { x: Math.max(8, Math.min(floatPosition.value.x, document.documentElement.clientWidth - 56)), y: Math.max(8, Math.min(floatPosition.value.y, document.documentElement.clientHeight - 56)) }
}
function floatPointerDown(event) {
  if (event.button !== 0) return
  const rect = event.currentTarget.getBoundingClientRect()
  dragState = { id: event.pointerId, startX: event.clientX, startY: event.clientY, x: rect.left, y: rect.top, moved: false }
  event.currentTarget.setPointerCapture(event.pointerId)
}
function floatPointerMove(event) {
  if (!dragState || dragState.id !== event.pointerId) return
  const dx = event.clientX - dragState.startX, dy = event.clientY - dragState.startY
  if (!dragState.moved && Math.hypot(dx, dy) < 6) return
  dragState.moved = true; dragging.value = true; clearTimeout(clickTimer); clickTimer = null
  floatPosition.value = { x: dragState.x + dx, y: dragState.y + dy }; clampFloatPosition()
}
function floatPointerUp(event) {
  if (!dragState || dragState.id !== event.pointerId) return
  if (dragState.moved && settings.value.snapToday) {
    const pos = floatPosition.value
    const edges = [{ distance: pos.x, x: 8, y: pos.y }, { distance: document.documentElement.clientWidth - 48 - pos.x, x: document.documentElement.clientWidth - 56, y: pos.y }, { distance: pos.y, x: pos.x, y: 8 }, { distance: document.documentElement.clientHeight - 48 - pos.y, x: pos.x, y: document.documentElement.clientHeight - 56 }]
    const nearest = edges.reduce((a, b) => a.distance < b.distance ? a : b)
    floatPosition.value = { x: nearest.x, y: nearest.y }; clampFloatPosition()
  } else if (!dragState.moved && clickTimer) {
    clearTimeout(clickTimer); clickTimer = null; floatPosition.value = null
  } else if (!dragState.moved) {
    clickTimer = setTimeout(() => { clickTimer = null; goToday() }, 320)
  }
  dragState = null; dragging.value = false
}
function floatPointerCancel() { dragState = null; dragging.value = false; clearTimeout(clickTimer); clickTimer = null }
function clearSpotlight() {
  if (spotlightFrame !== null) cancelAnimationFrame(spotlightFrame)
  spotlightFrame = null
  spotlightPointer = null
  for (const cell of litCells) cell.classList.remove('spotlit')
  litCells.clear()
}
function spotlight(event) {
  if (!settings.value.showSpotlight) return
  spotlightPointer = { grid: event.currentTarget, x: event.clientX, y: event.clientY }
  if (spotlightFrame !== null) return
  spotlightFrame = requestAnimationFrame(() => {
    spotlightFrame = null
    if (!settings.value.showSpotlight || !spotlightPointer) return
    const { grid, x, y } = spotlightPointer
    const rect = grid.getBoundingClientRect()
    const px = x - rect.left, py = y - rect.top
    // Read all geometry before changing styles to avoid repeated layout calculations.
    const nearby = Array.from(grid.querySelectorAll('.day-cell'), cell => ({
      cell, left: cell.offsetLeft, top: cell.offsetTop, width: cell.offsetWidth, height: cell.offsetHeight
    })).filter(({ left, top, width, height }) =>
      px >= left - 100 && px <= left + width + 100 && py >= top - 100 && py <= top + height + 100)
    const next = new Set(nearby.map(({ cell }) => cell))
    for (const cell of litCells) if (!next.has(cell)) cell.classList.remove('spotlit')
    grid.style.setProperty('--spot-x', `${px - 150}px`)
    grid.style.setProperty('--spot-y', `${py - 150}px`)
    for (const { cell, left, top } of nearby) {
      cell.style.setProperty('--cell-spot-x', `${px - left}px`)
      cell.style.setProperty('--cell-spot-y', `${py - top}px`)
      cell.classList.add('spotlit')
    }
    litCells = next
  })
}
function changeSidebarDefault(value) {
  settings.value.sidebarDefaultOpen = value
  sidebarCollapsed.value = !value
  if (window.matchMedia('(max-width: 680px)').matches) mobileNav.value = value && settings.value.showSidebar
  notifySaved()
}
function toggleSidebar() { if (window.matchMedia('(max-width: 680px)').matches) mobileNav.value = true; else sidebarCollapsed.value = !sidebarCollapsed.value }
function setView(value) { view.value = value; current.value = selected.value; mobileNav.value = false }
function jump(event) { try { const date = parseDate(event.target.value); if (date.year >= 1900 && date.year <= 2100) { current.value = date; selected.value = date } } catch {} }
async function notifySaved(message = '设置已保存') { await nextTick(); if (!storageError.value) Message.success({ id: 'calendar-settings', content: message, duration: 1800 }) }
async function changeModule(key, value) {
  if (key === 'showHistory' && value) {
    pendingHistory.value = true
    await nextTick(); document.querySelector('.history-confirm-accept')?.focus()
    return
  }
  settings.value[key] = value
  if (key === 'showSidebar') {
    sidebarContentKeys.forEach(item => { settings.value[item] = value })
    if (value) sidebarCollapsed.value = false
  } else if (sidebarContentKeys.includes(key)) {
    settings.value.showSidebar = sidebarContentKeys.some(item => settings.value[item])
    if (value) sidebarCollapsed.value = false
  }
  notifySaved()
}
async function resolveHistory(confirmed) {
  pendingHistory.value = false
  if (confirmed) { settings.value.showHistory = true; notifySaved() }
  await nextTick(); document.querySelector('.settings-modal [aria-label="历史上的今天"]')?.focus()
}
function toggleMode() { settings.value.mode = settings.value.mode === 'dark' ? 'light' : 'dark'; notifySaved(settings.value.mode === 'dark' ? '已切换深色模式' : '已切换浅色模式') }
function selectPreset(preset) { settings.value.accent = preset.id; notifySaved('主色已更新') }
function setCustomColor(value) { const color = normalizeHex(value); if (color && color !== baseColor.value) { settings.value.customColor = color; settings.value.accent = 'custom'; colorPickerChanged.value = true } }
async function colorPickerVisibility(visible) {
  colorPickerOpen.value = visible
  if (visible) {
    await nextTick()
    requestAnimationFrame(() => document.querySelector('.arco-color-picker-panel input.arco-input')?.setAttribute('aria-label', '颜色十六进制'))
  } else if (colorPickerChanged.value) { colorPickerChanged.value = false; notifySaved('主色已更新') }
}
async function toggleColorPickerFromKeyboard() {
  colorPickerVisibility(!colorPickerOpen.value)
  if (colorPickerOpen.value) { await nextTick(); requestAnimationFrame(() => document.querySelector('.arco-color-picker-panel input.arco-input:not([disabled])')?.focus()) }
}
function focusModal() { document.querySelector('.settings-modal .settings-close')?.focus() }
function handleModalEscape(event) {
  if (event.key !== 'Escape' || !modal.value) return
  if (pendingHistory.value) {
    resolveHistory(false)
  } else if (colorPickerOpen.value) {
    colorPickerVisibility(false)
    nextTick(() => document.querySelector('.settings-modal .color-picker-shell')?.focus())
  } else if (zoneSelectOpen.value || weekSelectOpen.value || cornerSelectOpen.value) {
    const label = zoneSelectOpen.value ? '时区' : weekSelectOpen.value ? '每周从' : '休班标记位置'
    zoneSelectOpen.value = false; weekSelectOpen.value = false; cornerSelectOpen.value = false
    nextTick(() => document.querySelector(`.settings-modal input[aria-label="${label}"]`)?.focus())
  } else modal.value = false
  event.preventDefault(); event.stopPropagation()
}
function modalKeydown(event) {
  if (event.key !== 'Tab') return
  const modalNode = document.querySelector('.settings-modal')
  if (!modalNode?.contains(document.activeElement)) return
  const focusable = [...modalNode.querySelectorAll('button:not([disabled]), input:not([disabled]), [tabindex="0"]')].filter(node => node.getClientRects().length > 0)
  if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); focusable.at(-1)?.focus() }
  else if (!event.shiftKey && document.activeElement === focusable.at(-1)) { event.preventDefault(); focusable[0]?.focus() }
}
</script>

<template>
  <div class="app" :data-mode="settings.mode" :style="themeStyles" @keydown.esc="mobileNav = false">
    <a class="skip" href="#calendar">跳转到日历</a>
    <aside v-if="settings.showSidebar" class="sidebar" :class="{ 'sidebar-open': mobileNav, 'sidebar-collapsed': sidebarCollapsed }">
      <div class="brand" :class="{ 'brand-hidden': !settings.showBrand }"><template v-if="settings.showBrand"><div class="brand-icon"><CalendarDays :size="20" /></div><strong>Luxury<span>日历</span></strong></template><button class="icon-btn mobile-close" aria-label="关闭导航" @click="mobileNav = false"><X :size="19" /></button></div>
      <nav v-if="settings.showViewNav" class="nav" aria-label="视图导航">
        <button :class="{ active: view === 'month' }" @click="setView('month')"><LayoutGrid :size="18" />月视图</button>
        <button :class="{ active: view === 'week' }" @click="setView('week')"><CalendarRange :size="18" />周视图</button>
        <button :class="{ active: view === 'day' }" @click="setView('day')"><Clock3 :size="18" />日视图</button>
      </nav>
      <template v-if="settings.showMini"><div class="sidebar-line"></div>
      <div class="mini-heading"><strong>{{ current.year }}年 {{ current.month }}月</strong><div><button class="icon-btn mini-arrow" aria-label="上个月" @click="moveMini(-1)"><ChevronLeft :size="16" /></button><button class="icon-btn mini-arrow" aria-label="下个月" @click="moveMini(1)"><ChevronRight :size="16" /></button></div></div>
      <div class="mini-grid"><span v-for="label in labels" :key="label" class="mini-label">{{ label }}</span><button v-for="day in miniDays" :key="dateKey(day)" :disabled="day.year < 1900 || day.year > 2100" :class="{ muted: day.month !== current.month, 'mini-selected': dateKey(day) === dateKey(selected), 'mini-today': dateKey(day) === dateKey(today) }" :aria-label="formatDate(day, { year: 'numeric', month: 'long', day: 'numeric' })" @click="current = day; selected = day">{{ day.day }}</button></div></template>
    </aside>
    <main id="calendar" class="main">
      <header class="topbar"><div class="top-title"><button v-if="settings.showSidebar" class="icon-btn menu-button" aria-label="展开或收起侧边栏" :title="sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'" @click="toggleSidebar"><Menu class="mobile-menu-icon" :size="20" /><PanelLeftOpen v-if="sidebarCollapsed" class="desktop-menu-icon" :size="20" /><PanelLeftClose v-else class="desktop-menu-icon" :size="20" /></button><strong>日历</strong></div><div class="top-actions"><span v-if="settings.showZone" class="zone-label"><Globe2 :size="16" />{{ settings.zone.replaceAll('_', ' ') }}</span><button class="icon-btn theme-toggle" :aria-label="settings.mode === 'dark' ? '切换至浅色模式' : '切换至深色模式'" :title="settings.mode === 'dark' ? '浅色模式' : '深色模式'" @click="toggleMode"><Sun v-if="settings.mode === 'dark'" :size="19" /><Moon v-else :size="19" /></button><button class="icon-btn" aria-label="设置" @click="modal = true"><Settings2 :size="19" /></button></div></header>
      <div class="content">
        <div v-if="settings.showDateTime" class="page-heading"><div><div class="overline">CALENDAR</div><h1>日历</h1></div><div class="today-label"><time class="current-time">{{ timeText }}</time><div>今天 <strong>{{ formatDate(today, { month: 'long', day: 'numeric', weekday: 'long' }) }}</strong></div></div></div>
        <a-alert v-if="storageError" type="error" show-icon class="storage-error">设置无法保存，请检查浏览器存储权限。</a-alert>
        <div class="workspace" :class="{ 'calendar-only': !settings.showDate && !settings.showHistory }"><section class="calendar-card card" aria-label="日历视图">
          <div class="calendar-toolbar"><div class="period-heading"><div class="period-selects"><span v-input-label="'选择年份'"><a-select class="year-select" :model-value="current.year" :options="yearOptions" :virtual-list-props="{ height: 240 }" allow-search @change="value => changePeriod('year', value)" /></span><span v-input-label="'选择月份'"><a-select class="month-select" :model-value="current.month" :options="monthOptions" @change="value => changePeriod('month', value)" /></span></div><span class="period-label" :class="{ invisible: view === 'month' }">{{ title }}</span></div><div class="toolbar-actions"><div class="arrows"><button class="icon-btn" aria-label="上一个时间段" @click="move(-1)"><ChevronLeft :size="19" /></button><button class="icon-btn" aria-label="下一个时间段" @click="move(1)"><ChevronRight :size="19" /></button></div><button class="today-button" aria-label="回到今天" title="回到今天" @click="goToday">今</button><label class="jump-label" title="跳转日期"><CalendarDays :size="16" /><span class="sr-only">跳转日期</span><input type="date" min="1900-01-01" max="2100-12-31" :value="dateKey(selected)" aria-label="跳转日期" @change="jump"></label><div class="view-switch" aria-label="视图切换"><button v-for="item in [{id:'month',name:'月'}, {id:'week',name:'周'}, {id:'day',name:'日'}]" :key="item.id" :class="{ chosen: view === item.id }" :aria-pressed="view === item.id" @click="setView(item.id)">{{ item.name }}</button></div></div></div>
          <div class="weekdays" :class="{ invisible: view === 'day' }" :aria-hidden="view === 'day'"><span v-for="label in labels" :key="label">周{{ label }}</span></div>
          <div class="calendar-grid" @pointermove="spotlight" @pointerleave="clearSpotlight" :class="{ 'week-grid': view === 'week', 'day-grid': view === 'day', 'spotlight-enabled': settings.showSpotlight }"><button v-for="day in days" :key="dateKey(day)" class="day-cell" :disabled="day.year < 1900 || day.year > 2100" :class="{ outside: view === 'month' && day.month !== current.month, selected: dateKey(day) === dateKey(selected), 'is-today': dateKey(day) === dateKey(today), 'has-holiday': settings.showHoliday && dayInfo(day).holiday }" :aria-label="dayLabel(day)" :aria-pressed="dateKey(day) === dateKey(selected)" :aria-current="dateKey(day) === dateKey(today) ? 'date' : undefined" :title="[dayInfo(day).term, ...(dayInfo(day).festivals || [])].filter(Boolean).join('、')" @click="choose(day)"><span class="day-number">{{ day.day }}</span><span class="lunar" :class="{ festive: dayObservances(day).length }"><Transition name="festival" mode="out-in"><span :key="settings.showLunar ? dayText(day) : ''">{{ settings.showLunar ? dayText(day) : '' }}</span></Transition></span><span v-if="settings.showHoliday && dayInfo(day).holiday" class="holiday-badge" :class="[settings.holidayCorner, { work: dayInfo(day).holiday.work }]"><span>{{ dayInfo(day).holiday.work ? '班' : '休' }}</span></span></button></div>
          <div class="calendar-footer"><div class="footer-meta"><span class="relative-date" aria-live="polite"><a-tag size="small">{{ dateKey(selected) }} · {{ relativeText }}</a-tag></span><span v-if="settings.showHoliday && holidayStatus" class="holiday-status">{{ holidayStatus }}</span></div><span v-if="settings.showHoliday" class="holiday-legend"><i class="legend holiday"></i>休息 <i class="legend work"></i>调休上班</span></div>
        </section>
        <aside v-if="settings.showDate || settings.showHistory" class="detail-column"><section v-if="settings.showDate" class="date-card card"><div class="section-kicker">选中日期 <CalendarDays :size="17" /></div><div class="date-display"><strong>{{ String(selected.day).padStart(2, '0') }}</strong><div><b>{{ formatDate(selected, { weekday: 'long' }) }}</b><span>{{ selected.year }}年{{ selected.month }}月</span></div></div><div v-if="settings.showLunar" class="lunar-line"><span>{{ info.full || info.lunar }}</span><div v-if="info.term || info.festivals?.length" class="festival-tags"><span v-for="label in [...new Set([info.term, ...(info.festivals || [])].filter(Boolean))]" :key="label" class="festival-tag">{{ label }}</span></div></div><div v-if="settings.showHoliday && info.holiday" class="holiday-line">{{ info.holiday.name }} · {{ info.holiday.work ? '调休上班' : '放假' }}</div></section>
          <section v-if="settings.showHistory" class="history-card card"><div class="section-head"><h3>历史上的今天</h3><History :size="18" /></div><div v-if="history.length" class="history-list" tabindex="0" aria-label="历史事件列表"><div v-for="(item, index) in history" :key="`${item.year}-${index}`" class="history-item"><span class="history-year">{{ item.year }}</span><p>{{ item.text }}</p></div></div><div v-else class="history-empty"><a-spin v-if="historyStatus === 'loading'" :size="16" /> <span>{{ historyStatus === 'loading' ? '正在加载…' : '暂无数据' }}</span></div><div class="history-foot"><a v-if="historyStatus === 'ready'" href="https://zh.wikipedia.org/" target="_blank" rel="noopener noreferrer">来源：中文维基百科 ↗</a><span v-else>{{ historyStatus === 'loading' ? '正在加载' : '网络不可用 · 本地数据' }}</span></div></section>
        </aside></div>
      </div>
    </main>
    <div v-if="mobileNav && settings.showSidebar" class="nav-backdrop" @click="mobileNav = false"></div>
    <button v-if="dateKey(selected) !== dateKey(today)" class="float-today" :class="{ dragging }" :style="floatPosition ? { left: `${floatPosition.x}px`, top: `${floatPosition.y}px`, bottom: 'auto', transform: 'none' } : null" aria-label="回到今天，双击重置按钮位置" title="回到今天；拖动调整位置，双击复位" @pointerdown="floatPointerDown" @pointermove="floatPointerMove" @pointerup="floatPointerUp" @pointercancel="floatPointerCancel" @keydown.enter.prevent="goToday" @keydown.space.prevent="goToday">今</button>
    <a-modal :visible="modal" role="dialog" aria-modal="true" aria-labelledby="settings-title" modal-class="settings-modal" :closable="false" :esc-to-close="false" :footer="false" :width="430" :body-style="{ maxHeight: 'min(70vh, 620px)', overflowY: 'auto' }" unmount-on-close @open="focusModal" @keydown.capture="modalKeydown" @cancel="modal = false"><template #title><div class="settings-title"><h2 id="settings-title">设置</h2><button class="icon-btn settings-close" aria-label="关闭设置" @click="modal = false"><X :size="18" /></button></div></template>
      <div class="form-stack">
        <fieldset><legend>主色</legend><div class="swatches"><button v-for="preset in presets" :key="preset.id" class="swatch" :data-color="preset.id" :class="{ 'swatch-active': settings.accent === preset.id }" :aria-label="preset.name" :aria-pressed="settings.accent === preset.id" :title="preset.name" @click="selectPreset(preset)"><span></span></button></div><div class="custom-color"><span>自定义颜色</span><div class="color-picker-shell" role="button" tabindex="0" aria-label="自定义主色" aria-haspopup="dialog" :aria-expanded="colorPickerOpen" @keydown.enter.prevent.stop="toggleColorPickerFromKeyboard" @keydown.space.prevent.stop="toggleColorPickerFromKeyboard"><a-color-picker :model-value="baseColor" format="hex" show-text disabled-alpha :show-history="false" :trigger-props="{ popupVisible: colorPickerOpen, popupContainer: '.arco-modal-container' }" @change="setCustomColor" @popup-visible-change="colorPickerVisibility" /></div></div></fieldset>
        <a-alert v-if="theme.adjusted" type="warning" show-icon>当前模式下，主色已从 {{ theme.original }} 调整为 {{ theme.accent }}，以提高对比度。</a-alert>
        <a-alert v-else type="info" show-icon>主色可能随明暗模式调整；休班等状态颜色保持独立。</a-alert>
        <div v-input-label="'时区'" class="setting-field"><span>时区</span><a-select v-model="settings.zone" v-model:popup-visible="zoneSelectOpen" :options="zones" popup-container=".arco-modal-container" allow-search @change="notifySaved()" /></div>
        <div v-input-label="'每周从'" class="setting-field"><span>每周从</span><a-select v-model="settings.firstDay" v-model:popup-visible="weekSelectOpen" :options="firstDayOptions" popup-container=".arco-modal-container" @change="notifySaved()" /></div>
        <div v-input-label="'休班标记位置'" class="setting-field"><span>休班标记位置</span><a-select v-model="settings.holidayCorner" v-model:popup-visible="cornerSelectOpen" :options="cornerOptions" popup-container=".arco-modal-container" @change="notifySaved()" /></div>
        <div class="switch-row"><span>默认展开侧边栏</span><a-switch :model-value="settings.sidebarDefaultOpen" aria-label="默认展开侧边栏" :checked-color="theme.control" @change="changeSidebarDefault" /></div>
        <div class="switch-row"><span>悬浮按钮拖动后自动吸附</span><a-switch v-model="settings.snapToday" aria-label="悬浮按钮拖动后自动吸附" :checked-color="theme.control" @change="notifySaved()" /></div>
        <fieldset class="module-options"><legend>显示内容</legend><div v-for="item in modules" :key="item.key" class="module-option"><div class="switch-row"><span>{{ item.label }}</span><a-switch :model-value="settings[item.key]" :aria-label="item.label" :checked-color="theme.control" @change="value => changeModule(item.key, value)" /></div><div v-if="item.key === 'showHistory' && pendingHistory" class="history-confirm" role="alert"><p>打开可能加载较慢影响体验，是否仍然打开？</p><div class="history-confirm-actions"><button type="button" @click="resolveHistory(false)">取消</button><button type="button" class="history-confirm-accept" @click="resolveHistory(true)">确定</button></div></div></div></fieldset>
        <p class="settings-note">农历与节假日按中国大陆日期显示。未覆盖的年份不标注休或班。</p>
      </div>
    </a-modal>
  </div>
</template>
