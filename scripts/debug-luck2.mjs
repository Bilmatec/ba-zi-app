// Replicate luck.ts's exact conversion path for the Wikibooks example.
import { DateTime, FixedOffsetZone } from 'luxon'
import { Solar } from 'lunar-typescript'

const wall = DateTime.fromObject(
  { year: 2000, month: 8, day: 28, hour: 12, minute: 0 },
  { zone: 'Asia/Shanghai' },
)
const chinaLocal = wall.setZone(FixedOffsetZone.instance(8 * 60))
console.log('wall:', wall.toISO(), 'chinaLocal:', chinaLocal.toISO())

const ec = Solar.fromYmdHms(
  chinaLocal.year, chinaLocal.month, chinaLocal.day, chinaLocal.hour, chinaLocal.minute, 0,
).getLunar().getEightChar()

const yun = ec.getYun(1)
console.log('forward:', yun.isForward(), 'start:', yun.getStartYear(), 'y', yun.getStartMonth(), 'm')
console.log('pillars:', yun.getDaYun(4).slice(1).map((d) => d.getGanZhi() + '@' + d.getStartYear()).join(', '))
