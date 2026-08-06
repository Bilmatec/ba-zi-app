// Cross-check the Ten Gods polarity rule against the calculation library.
// Day master 甲 (Jiǎ) is YANG wood; each pair below tests one relationship
// category at same vs opposite polarity.
import { LunarUtil } from 'lunar-typescript'

const cases = [
  ['Wealth (DM controls it)', '戊 yang earth  SAME', '甲戊'],
  ['Wealth (DM controls it)', '己 yin earth   OPPOSITE', '甲己'],
  ['Officer (it controls DM)', '庚 yang metal  SAME', '甲庚'],
  ['Officer (it controls DM)', '辛 yin metal   OPPOSITE', '甲辛'],
  ['Resource (it feeds DM)', '壬 yang water  SAME', '甲壬'],
  ['Resource (it feeds DM)', '癸 yin water   OPPOSITE', '甲癸'],
  ['Companion (same element)', '甲 yang wood   SAME', '甲甲'],
  ['Companion (same element)', '乙 yin wood    OPPOSITE', '甲乙'],
  ['Output (DM produces it)', '丙 yang fire   SAME', '甲丙'],
  ['Output (DM produces it)', '丁 yin fire    OPPOSITE', '甲丁'],
]

for (const [cat, pol, key] of cases) {
  console.log(cat.padEnd(26), pol.padEnd(24), '=>', LunarUtil.SHI_SHEN[key])
}
