// Independent cross-check of the day pillar.
//
// The library's sexagenary day cycle is compared against a from-scratch
// Julian Day Number calculation anchored to a documented historical fact:
// 1 October 1949 was a JiaZi (甲子) day, the first day of the 60-day cycle.
// If the two independent methods agree for every date over a long span,
// the day pillar can be trusted.

import { Solar } from 'lunar-typescript'

const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

// Gregorian date -> Julian Day Number (integer, noon-based), standard formula.
function jdn(y, m, d) {
  const a = Math.floor((14 - m) / 12)
  const yy = y + 4800 - a
  const mm = m + 12 * a - 3
  return (
    d +
    Math.floor((153 * mm + 2) / 5) +
    365 * yy +
    Math.floor(yy / 4) -
    Math.floor(yy / 100) +
    Math.floor(yy / 400) -
    32045
  )
}

// Anchor: JDN(1949-10-01) = 2433191 must map to index 0 (JiaZi).
const anchor = jdn(1949, 10, 1)
const OFFSET = ((0 - anchor) % 60 + 60) % 60 // additive constant

function dayGanzhiFromJdn(y, m, d) {
  const idx = (jdn(y, m, d) + OFFSET) % 60
  return GAN[idx % 10] + ZHI[idx % 12]
}

// Sanity: the anchor itself
console.log('Anchor 1949-10-01 by formula:', dayGanzhiFromJdn(1949, 10, 1), '(expected 甲子)')

// Sweep every day from 1900-01-01 to 2050-12-31 and compare with the library.
let checked = 0
let mismatches = 0
const start = Date.UTC(1900, 0, 1)
const end = Date.UTC(2050, 11, 31)
for (let t = start; t <= end; t += 86400000) {
  const dt = new Date(t)
  const y = dt.getUTCFullYear()
  const m = dt.getUTCMonth() + 1
  const d = dt.getUTCDate()
  // Noon, so no day-boundary subtleties are in play for this comparison.
  const lib = Solar.fromYmdHms(y, m, d, 12, 0, 0).getLunar().getDayInGanZhi()
  const ours = dayGanzhiFromJdn(y, m, d)
  checked++
  if (lib !== ours) {
    mismatches++
    if (mismatches <= 10) console.log(`MISMATCH ${y}-${m}-${d}: library=${lib} formula=${ours}`)
  }
}
console.log(`Checked ${checked} days (1900–2050). Mismatches: ${mismatches}`)
