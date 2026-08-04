// Debug the Wikibooks luck-pillar example: male born 2000-08-28.
import { Solar } from 'lunar-typescript'

const solar = Solar.fromYmdHms(2000, 8, 28, 12, 0, 0)
const lunar = solar.getLunar()
const ec = lunar.getEightChar()

console.log('month pillar:', ec.getMonth())
console.log('year pillar (exact):', ec.getYear())

console.log('prev jie:', lunar.getPrevJie().getName(), lunar.getPrevJie().getSolar().toYmdHms())
console.log('next jie:', lunar.getNextJie().getName(), lunar.getNextJie().getSolar().toYmdHms())

for (const sect of [1, 2]) {
  const yun = ec.getYun(1, sect)
  console.log(
    `sect ${sect}: forward=${yun.isForward()} start=${yun.getStartYear()}y ${yun.getStartMonth()}m ${yun.getStartDay()}d`,
    'startSolar=', yun.getStartSolar().toYmd(),
  )
  console.log('  first pillars:', yun.getDaYun(4).slice(1).map((d) => d.getGanZhi() + '@' + d.getStartYear()).join(', '))
}
