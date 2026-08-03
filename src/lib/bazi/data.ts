// Display metadata for the 10 Heavenly Stems and 12 Earthly Branches.
// The chart calculation itself comes from lunar-typescript; these tables
// only translate its Chinese characters into element/polarity/label info
// for display. Standard assignments; cross-checked against the library's
// own WU_XING_GAN / WU_XING_ZHI tables in the verification tests.

export type Element = 'Wood' | 'Fire' | 'Earth' | 'Metal' | 'Water'
export type Polarity = 'Yang' | 'Yin'

export interface StemInfo {
  chinese: string
  pinyin: string
  element: Element
  polarity: Polarity
}

export interface BranchInfo {
  chinese: string
  pinyin: string
  animal: string
  element: Element
  polarity: Polarity
}

export const STEMS: Record<string, StemInfo> = {
  甲: { chinese: '甲', pinyin: 'Jiǎ', element: 'Wood', polarity: 'Yang' },
  乙: { chinese: '乙', pinyin: 'Yǐ', element: 'Wood', polarity: 'Yin' },
  丙: { chinese: '丙', pinyin: 'Bǐng', element: 'Fire', polarity: 'Yang' },
  丁: { chinese: '丁', pinyin: 'Dīng', element: 'Fire', polarity: 'Yin' },
  戊: { chinese: '戊', pinyin: 'Wù', element: 'Earth', polarity: 'Yang' },
  己: { chinese: '己', pinyin: 'Jǐ', element: 'Earth', polarity: 'Yin' },
  庚: { chinese: '庚', pinyin: 'Gēng', element: 'Metal', polarity: 'Yang' },
  辛: { chinese: '辛', pinyin: 'Xīn', element: 'Metal', polarity: 'Yin' },
  壬: { chinese: '壬', pinyin: 'Rén', element: 'Water', polarity: 'Yang' },
  癸: { chinese: '癸', pinyin: 'Guǐ', element: 'Water', polarity: 'Yin' },
}

export const BRANCHES: Record<string, BranchInfo> = {
  子: { chinese: '子', pinyin: 'Zǐ', animal: 'Rat', element: 'Water', polarity: 'Yang' },
  丑: { chinese: '丑', pinyin: 'Chǒu', animal: 'Ox', element: 'Earth', polarity: 'Yin' },
  寅: { chinese: '寅', pinyin: 'Yín', animal: 'Tiger', element: 'Wood', polarity: 'Yang' },
  卯: { chinese: '卯', pinyin: 'Mǎo', animal: 'Rabbit', element: 'Wood', polarity: 'Yin' },
  辰: { chinese: '辰', pinyin: 'Chén', animal: 'Dragon', element: 'Earth', polarity: 'Yang' },
  巳: { chinese: '巳', pinyin: 'Sì', animal: 'Snake', element: 'Fire', polarity: 'Yin' },
  午: { chinese: '午', pinyin: 'Wǔ', animal: 'Horse', element: 'Fire', polarity: 'Yang' },
  未: { chinese: '未', pinyin: 'Wèi', animal: 'Goat', element: 'Earth', polarity: 'Yin' },
  申: { chinese: '申', pinyin: 'Shēn', animal: 'Monkey', element: 'Metal', polarity: 'Yang' },
  酉: { chinese: '酉', pinyin: 'Yǒu', animal: 'Rooster', element: 'Metal', polarity: 'Yin' },
  戌: { chinese: '戌', pinyin: 'Xū', animal: 'Dog', element: 'Earth', polarity: 'Yang' },
  亥: { chinese: '亥', pinyin: 'Hài', animal: 'Pig', element: 'Water', polarity: 'Yin' },
}
