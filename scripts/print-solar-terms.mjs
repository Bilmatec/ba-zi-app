// Print the library's computed solar term instants (UTC+8 clock) for given
// years, so they can be compared against the Hong Kong Observatory's
// published tables (HKT is UTC+8, same clock).

import { Solar } from 'lunar-typescript'

const years = process.argv.slice(2).map(Number)
for (const year of years) {
  console.log(`--- ${year} ---`)
  // Grab the jieqi table via a Lunar instance mid-year.
  const lunar = Solar.fromYmdHms(year, 6, 1, 12, 0, 0).getLunar()
  const table = lunar.getJieQiTable()
  const wanted = [
    '立春', '惊蛰', '清明', '立夏', '芒种', '小暑',
    '立秋', '白露', '寒露', '立冬', '大雪', '小寒',
    '冬至', '夏至', '春分', '秋分',
  ]
  const rows = []
  for (const [name, solar] of Object.entries(table)) {
    if (wanted.includes(name) && solar.getYear() === year) {
      rows.push([solar.toYmdHms(), name])
    }
  }
  rows.sort()
  for (const [time, name] of rows) console.log(`${name}  ${time}`)
}
