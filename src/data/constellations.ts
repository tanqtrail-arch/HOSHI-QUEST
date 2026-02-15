export interface Star {
  x: number
  y: number
  magnitude: number
}

export interface ConstellationConnection {
  from: number
  to: number
}

export interface Constellation {
  id: string
  name: string
  nameKanji: string
  latin: string
  abbreviation: string
  season: string
  category: string
  magnitude: number
  mythology: string
  findingTip: string
  brightestStar: string
  stars: Star[]
  connections: ConstellationConnection[]
  hints: string[]
  keywords: string[]
  area: { x: number; y: number; width: number; height: number }
}

export const constellations: Constellation[] = [
  {
    id: 'orion',
    name: 'オリオン座',
    nameKanji: '猟師座',
    latin: 'Orion',
    abbreviation: 'Ori',
    season: '冬',
    category: '黄道外',
    magnitude: 0.1,
    mythology: 'ギリシャ神話の狩人オリオン。サソリに刺されて命を落とし、天に上げられました。冬の夜空で最も目立つ星座の一つです。',
    findingTip: '冬の南の空に三つ星が並んでいるのが目印です。',
    brightestStar: 'リゲル',
    stars: [
      { x: 35, y: 15, magnitude: 0.5 },   // ベテルギウス
      { x: 65, y: 85, magnitude: 0.1 },   // リゲル
      { x: 60, y: 18, magnitude: 1.6 },   // ベラトリクス
      { x: 38, y: 82, magnitude: 2.1 },   // サイフ
      { x: 45, y: 45, magnitude: 1.7 },   // ミンタカ
      { x: 50, y: 50, magnitude: 1.7 },   // アルニラム
      { x: 55, y: 55, magnitude: 2.2 },   // アルニタク
    ],
    connections: [
      { from: 0, to: 2 }, { from: 0, to: 4 },
      { from: 2, to: 4 }, { from: 4, to: 5 },
      { from: 5, to: 6 }, { from: 6, to: 3 },
      { from: 6, to: 1 }, { from: 3, to: 1 },
    ],
    hints: [
      'この星座には「三つ星」と呼ばれる有名な並びがあります。',
      '冬の南の空で最も見つけやすい星座の一つです。',
      '赤い超巨星ベテルギウスと青白い恒星リゲルが特徴です。',
      'ギリシャ神話の偉大な狩人の名前がつけられています。',
    ],
    keywords: ['オリオン', 'おりおん', '冬の大三角', '三つ星'],
    area: { x: 35, y: 30, width: 16, height: 22 },
  },
  {
    id: 'ursa_major',
    name: 'おおぐま座',
    nameKanji: '大熊座',
    latin: 'Ursa Major',
    abbreviation: 'UMa',
    season: '春',
    category: '北天',
    magnitude: 1.8,
    mythology: 'ゼウスに愛されたカリストがヘラの怒りを買い、熊に変えられました。息子アルカスに殺されそうになった時、ゼウスが二人を天に上げました。',
    findingTip: '北の空で柄杓の形（北斗七星）を探しましょう。',
    brightestStar: 'ドゥーベ',
    stars: [
      { x: 20, y: 30, magnitude: 1.8 },
      { x: 30, y: 28, magnitude: 2.4 },
      { x: 40, y: 32, magnitude: 2.4 },
      { x: 48, y: 38, magnitude: 3.3 },
      { x: 55, y: 45, magnitude: 1.8 },
      { x: 65, y: 42, magnitude: 2.1 },
      { x: 75, y: 38, magnitude: 1.9 },
    ],
    connections: [
      { from: 0, to: 1 }, { from: 1, to: 2 },
      { from: 2, to: 3 }, { from: 3, to: 4 },
      { from: 4, to: 5 }, { from: 5, to: 6 },
    ],
    hints: [
      'この星座には有名な「柄杓」の形が含まれています。',
      '北の空で一年中見ることができる星座です。',
      '北極星を見つけるための目印になる星座です。',
      '大きな動物の名前がついた、北天で最大級の星座です。',
    ],
    keywords: ['おおぐま', 'オオグマ', '大熊', '北斗七星'],
    area: { x: 20, y: 8, width: 22, height: 16 },
  },
  {
    id: 'scorpius',
    name: 'さそり座',
    nameKanji: '蠍座',
    latin: 'Scorpius',
    abbreviation: 'Sco',
    season: '夏',
    category: '黄道十二星座',
    magnitude: 1.0,
    mythology: 'オリオンを刺し殺したサソリが天に上げられました。そのため、オリオン座とさそり座は同時に空に現れないと言われています。',
    findingTip: '夏の南の空低くに赤い一等星アンタレスを探しましょう。',
    brightestStar: 'アンタレス',
    stars: [
      { x: 45, y: 15, magnitude: 2.3 },
      { x: 42, y: 25, magnitude: 2.6 },
      { x: 40, y: 35, magnitude: 2.9 },
      { x: 45, y: 45, magnitude: 1.0 },   // アンタレス
      { x: 50, y: 55, magnitude: 2.3 },
      { x: 55, y: 65, magnitude: 2.7 },
      { x: 52, y: 75, magnitude: 2.7 },
      { x: 45, y: 80, magnitude: 1.6 },
      { x: 40, y: 88, magnitude: 2.8 },
    ],
    connections: [
      { from: 0, to: 1 }, { from: 1, to: 2 },
      { from: 2, to: 3 }, { from: 3, to: 4 },
      { from: 4, to: 5 }, { from: 5, to: 6 },
      { from: 6, to: 7 }, { from: 7, to: 8 },
    ],
    hints: [
      'S字カーブの特徴的な形をしています。',
      '夏の南の空低くに見える星座です。',
      '赤い一等星「アンタレス」が心臓にあたります。',
      '毒を持つ節足動物の名前がつけられた星座です。',
    ],
    keywords: ['さそり', 'サソリ', '蠍', 'アンタレス'],
    area: { x: 35, y: 45, width: 14, height: 24 },
  },
  {
    id: 'leo',
    name: 'しし座',
    nameKanji: '獅子座',
    latin: 'Leo',
    abbreviation: 'Leo',
    season: '春',
    category: '黄道十二星座',
    magnitude: 1.4,
    mythology: 'ヘラクレスが最初の功業として退治したネメアの獅子。その毛皮はいかなる武器も通さないほど頑丈でした。',
    findingTip: '春の南の空で「?」マークを裏返した形を探しましょう。',
    brightestStar: 'レグルス',
    stars: [
      { x: 30, y: 70, magnitude: 1.4 },   // レグルス
      { x: 25, y: 55, magnitude: 2.6 },
      { x: 28, y: 40, magnitude: 3.0 },
      { x: 35, y: 28, magnitude: 2.0 },
      { x: 50, y: 22, magnitude: 2.1 },
      { x: 65, y: 30, magnitude: 2.6 },
      { x: 70, y: 45, magnitude: 2.1 },   // デネボラ
      { x: 60, y: 50, magnitude: 3.3 },
    ],
    connections: [
      { from: 0, to: 1 }, { from: 1, to: 2 },
      { from: 2, to: 3 }, { from: 3, to: 4 },
      { from: 4, to: 5 }, { from: 5, to: 6 },
      { from: 6, to: 7 }, { from: 7, to: 4 },
    ],
    hints: [
      '春の代表的な星座で、「?」マークを裏返した形が特徴です。',
      'この星座の一等星は「小さな王」を意味します。',
      '黄道十二星座の一つで、百獣の王に関係します。',
      'ヘラクレスに退治された猛獣の星座です。',
    ],
    keywords: ['しし', 'シシ', '獅子', 'レグルス'],
    area: { x: 30, y: 15, width: 18, height: 18 },
  },
  {
    id: 'cygnus',
    name: 'はくちょう座',
    nameKanji: '白鳥座',
    latin: 'Cygnus',
    abbreviation: 'Cyg',
    season: '夏',
    category: '北天',
    magnitude: 1.3,
    mythology: 'ゼウスが白鳥に化けてレダに近づいた姿とも、親友を助けようとして白鳥になったパエトンの友キュクノスとも言われています。',
    findingTip: '夏の天頂付近で大きな十字架の形を探しましょう（北十字）。',
    brightestStar: 'デネブ',
    stars: [
      { x: 50, y: 10, magnitude: 1.3 },   // デネブ
      { x: 50, y: 35, magnitude: 2.5 },
      { x: 50, y: 55, magnitude: 2.2 },
      { x: 50, y: 80, magnitude: 3.1 },   // アルビレオ
      { x: 30, y: 45, magnitude: 2.5 },
      { x: 70, y: 45, magnitude: 2.5 },
    ],
    connections: [
      { from: 0, to: 1 }, { from: 1, to: 2 },
      { from: 2, to: 3 }, { from: 4, to: 2 },
      { from: 2, to: 5 },
    ],
    hints: [
      '「北十字」とも呼ばれる十字架のような形をしています。',
      '夏の大三角を構成する一等星を持っています。',
      '天の川の中を飛ぶように見える優雅な鳥の星座です。',
      '白い大きな水鳥の名前がつけられた星座です。',
    ],
    keywords: ['はくちょう', 'ハクチョウ', '白鳥', '夏の大三角'],
    area: { x: 55, y: 8, width: 14, height: 20 },
  },
  {
    id: 'cassiopeia',
    name: 'カシオペヤ座',
    nameKanji: 'カシオペヤ座',
    latin: 'Cassiopeia',
    abbreviation: 'Cas',
    season: '秋',
    category: '北天',
    magnitude: 2.2,
    mythology: 'エチオピアの王妃カシオペヤは自分の美しさを誇り、海の神の怒りを買いました。罰として天に縛り付けられ、北極星の周りを回り続けています。',
    findingTip: '北の空で「W」の形を探しましょう。北極星の反対側にあります。',
    brightestStar: 'シェダル',
    stars: [
      { x: 20, y: 40, magnitude: 2.2 },
      { x: 35, y: 25, magnitude: 2.3 },
      { x: 50, y: 35, magnitude: 2.5 },
      { x: 65, y: 22, magnitude: 2.7 },
      { x: 80, y: 38, magnitude: 3.4 },
    ],
    connections: [
      { from: 0, to: 1 }, { from: 1, to: 2 },
      { from: 2, to: 3 }, { from: 3, to: 4 },
    ],
    hints: [
      'アルファベットの「W」の形が特徴的です。',
      '北極星のそばで一年中見ることができます。',
      '秋の夜空で見つけやすい、5つの星でできた星座です。',
      'ギリシャ神話のエチオピアの王妃の名前がつけられています。',
    ],
    keywords: ['カシオペヤ', 'カシオペア', 'かしおぺや', 'W字'],
    area: { x: 68, y: 2, width: 14, height: 10 },
  },
  {
    id: 'gemini',
    name: 'ふたご座',
    nameKanji: '双子座',
    latin: 'Gemini',
    abbreviation: 'Gem',
    season: '冬',
    category: '黄道十二星座',
    magnitude: 1.1,
    mythology: '双子の兄弟カストルとポルックス。兄カストルが死んだ時、不死の弟ポルックスはゼウスに願い、二人一緒に天に上げてもらいました。',
    findingTip: '冬の空でオリオン座の左上に二つの明るい星が並んでいます。',
    brightestStar: 'ポルックス',
    stars: [
      { x: 35, y: 10, magnitude: 1.6 },   // カストル
      { x: 45, y: 12, magnitude: 1.1 },   // ポルックス
      { x: 32, y: 30, magnitude: 2.9 },
      { x: 43, y: 32, magnitude: 2.9 },
      { x: 28, y: 55, magnitude: 3.4 },
      { x: 40, y: 52, magnitude: 3.5 },
      { x: 30, y: 75, magnitude: 3.1 },
      { x: 45, y: 72, magnitude: 3.6 },
    ],
    connections: [
      { from: 0, to: 2 }, { from: 2, to: 4 },
      { from: 4, to: 6 }, { from: 1, to: 3 },
      { from: 3, to: 5 }, { from: 5, to: 7 },
    ],
    hints: [
      '二つの明るい星が仲良く並んでいるのが特徴です。',
      '冬の星座で、オリオン座の近くにあります。',
      '黄道十二星座の一つで、兄弟に関係する星座です。',
      'カストルとポルックスという二人の名前で知られています。',
    ],
    keywords: ['ふたご', 'フタゴ', '双子', 'カストル', 'ポルックス'],
    area: { x: 58, y: 10, width: 14, height: 20 },
  },
  {
    id: 'lyra',
    name: 'こと座',
    nameKanji: '琴座',
    latin: 'Lyra',
    abbreviation: 'Lyr',
    season: '夏',
    category: '北天',
    magnitude: 0.0,
    mythology: '音楽の天才オルフェウスが奏でた竪琴。その美しい音色はあらゆる生き物を魅了し、岩さえも動かしたと言われています。',
    findingTip: '夏の天頂近く、非常に明るい青白い星ベガを探しましょう。',
    brightestStar: 'ベガ',
    stars: [
      { x: 50, y: 15, magnitude: 0.0 },   // ベガ
      { x: 40, y: 40, magnitude: 3.3 },
      { x: 55, y: 38, magnitude: 3.3 },
      { x: 38, y: 65, magnitude: 3.5 },
      { x: 58, y: 63, magnitude: 3.2 },
    ],
    connections: [
      { from: 0, to: 1 }, { from: 0, to: 2 },
      { from: 1, to: 3 }, { from: 2, to: 4 },
      { from: 3, to: 4 },
    ],
    hints: [
      '夏の大三角の一つの頂点にある、とても明るい星を含みます。',
      '小さいけれど、全天で5番目に明るい星を持つ星座です。',
      '七夕の「織姫星」として知られる星がある星座です。',
      '楽器の名前がついた星座です。',
    ],
    keywords: ['こと', 'コト', '琴', 'ベガ', '織姫', '夏の大三角'],
    area: { x: 58, y: 5, width: 10, height: 14 },
  },
  {
    id: 'aquila',
    name: 'わし座',
    nameKanji: '鷲座',
    latin: 'Aquila',
    abbreviation: 'Aql',
    season: '夏',
    category: '黄道外',
    magnitude: 0.8,
    mythology: 'ゼウスが使わせた鷲、あるいはゼウス自身が変身した鷲とされています。美少年ガニメデを天界にさらった鷲とも言われます。',
    findingTip: '夏の大三角の一つ、アルタイルを目印に探しましょう。',
    brightestStar: 'アルタイル',
    stars: [
      { x: 50, y: 35, magnitude: 0.8 },   // アルタイル
      { x: 40, y: 30, magnitude: 2.7 },
      { x: 60, y: 30, magnitude: 3.7 },
      { x: 35, y: 50, magnitude: 3.4 },
      { x: 65, y: 48, magnitude: 3.0 },
      { x: 50, y: 70, magnitude: 3.0 },
    ],
    connections: [
      { from: 1, to: 0 }, { from: 0, to: 2 },
      { from: 3, to: 0 }, { from: 0, to: 4 },
      { from: 3, to: 5 }, { from: 5, to: 4 },
    ],
    hints: [
      '夏の大三角を構成する星座の一つです。',
      '七夕伝説の「彦星」を含む星座です。',
      '天の川を挟んで「織姫星」の反対側にあります。',
      '大きな猛禽類の名前がついた星座です。',
    ],
    keywords: ['わし', 'ワシ', '鷲', 'アルタイル', '彦星', '夏の大三角'],
    area: { x: 42, y: 25, width: 12, height: 18 },
  },
  {
    id: 'taurus',
    name: 'おうし座',
    nameKanji: '牡牛座',
    latin: 'Taurus',
    abbreviation: 'Tau',
    season: '冬',
    category: '黄道十二星座',
    magnitude: 0.9,
    mythology: 'ゼウスがエウロペに近づくために変身した白い牡牛。エウロペを背に乗せて海を渡り、クレタ島へ連れ去りました。',
    findingTip: 'オリオン座の右上に赤い一等星アルデバランを探しましょう。すばる（プレアデス星団）も目印です。',
    brightestStar: 'アルデバラン',
    stars: [
      { x: 45, y: 45, magnitude: 0.9 },   // アルデバラン
      { x: 35, y: 40, magnitude: 3.5 },
      { x: 55, y: 38, magnitude: 3.0 },
      { x: 25, y: 30, magnitude: 1.7 },   // エルナト
      { x: 65, y: 28, magnitude: 2.9 },
      { x: 70, y: 60, magnitude: 3.5 },
      { x: 75, y: 65, magnitude: 3.7 },
    ],
    connections: [
      { from: 0, to: 1 }, { from: 0, to: 2 },
      { from: 1, to: 3 }, { from: 2, to: 4 },
      { from: 0, to: 5 }, { from: 5, to: 6 },
    ],
    hints: [
      'この星座には「すばる」として有名な星団があります。',
      '冬の空でオリオン座のすぐ近くにある星座です。',
      '赤い一等星アルデバランが目玉にあたります。',
      'ゼウスが変身した動物の星座です。角のある大きな家畜です。',
    ],
    keywords: ['おうし', 'オウシ', '牡牛', 'すばる', 'アルデバラン'],
    area: { x: 55, y: 22, width: 16, height: 16 },
  },
  {
    id: 'virgo',
    name: 'おとめ座',
    nameKanji: '乙女座',
    latin: 'Virgo',
    abbreviation: 'Vir',
    season: '春',
    category: '黄道十二星座',
    magnitude: 1.0,
    mythology: '豊穣の女神デメテル、または正義の女神アストライアとされています。人間の堕落に失望して天に帰った最後の神です。',
    findingTip: '春の夜空で、一等星スピカを探しましょう。北斗七星の柄の延長線上にあります。',
    brightestStar: 'スピカ',
    stars: [
      { x: 50, y: 65, magnitude: 1.0 },   // スピカ
      { x: 45, y: 50, magnitude: 2.7 },
      { x: 40, y: 35, magnitude: 3.4 },
      { x: 50, y: 25, magnitude: 2.8 },
      { x: 60, y: 30, magnitude: 3.6 },
      { x: 55, y: 45, magnitude: 3.4 },
      { x: 65, y: 50, magnitude: 3.9 },
    ],
    connections: [
      { from: 0, to: 1 }, { from: 1, to: 2 },
      { from: 2, to: 3 }, { from: 3, to: 4 },
      { from: 4, to: 5 }, { from: 5, to: 1 },
      { from: 5, to: 6 },
    ],
    hints: [
      '黄道十二星座の中で最も大きな星座です。',
      '春の大三角を構成する一等星を持っています。',
      '「真珠星」とも呼ばれるスピカが一等星です。',
      '若い女性を表す星座で、黄道十二星座の一つです。',
    ],
    keywords: ['おとめ', 'オトメ', '乙女', 'スピカ', '春の大三角'],
    area: { x: 38, y: 30, width: 18, height: 20 },
  },
  {
    id: 'pegasus',
    name: 'ペガスス座',
    nameKanji: '天馬座',
    latin: 'Pegasus',
    abbreviation: 'Peg',
    season: '秋',
    category: '黄道外',
    magnitude: 2.1,
    mythology: 'メドゥーサの首からペルセウスが切り落とした時に生まれた天馬。英雄ベレロフォンを乗せてキマイラ退治に活躍しました。',
    findingTip: '秋の空で大きな四角形（秋の大四辺形）を探しましょう。',
    brightestStar: 'エニフ',
    stars: [
      { x: 30, y: 30, magnitude: 2.5 },
      { x: 70, y: 28, magnitude: 2.4 },
      { x: 72, y: 65, magnitude: 2.8 },
      { x: 28, y: 68, magnitude: 2.1 },
      { x: 15, y: 85, magnitude: 2.4 },
    ],
    connections: [
      { from: 0, to: 1 }, { from: 1, to: 2 },
      { from: 2, to: 3 }, { from: 3, to: 0 },
      { from: 3, to: 4 },
    ],
    hints: [
      '秋の空に大きな四角形を作ることで知られています。',
      '「秋の大四辺形」と呼ばれる目印を持つ星座です。',
      'ギリシャ神話に登場する空を飛ぶ生き物の星座です。',
      '翼を持った馬の名前がつけられた星座です。',
    ],
    keywords: ['ペガスス', 'ぺがすす', 'ペガサス', '秋の大四辺形'],
    area: { x: 35, y: 10, width: 20, height: 20 },
  },
  {
    id: 'canis_major',
    name: 'おおいぬ座',
    nameKanji: '大犬座',
    latin: 'Canis Major',
    abbreviation: 'CMa',
    season: '冬',
    category: '黄道外',
    magnitude: -1.5,
    mythology: 'オリオンの猟犬、または足の速いライラプスとされています。全天で最も明るい恒星シリウスを持つことで有名です。',
    findingTip: 'オリオン座の三つ星を左下に延ばすと、ギラギラ輝くシリウスが見つかります。',
    brightestStar: 'シリウス',
    stars: [
      { x: 50, y: 20, magnitude: -1.5 },  // シリウス
      { x: 40, y: 35, magnitude: 1.5 },
      { x: 55, y: 40, magnitude: 1.8 },
      { x: 35, y: 55, magnitude: 2.0 },
      { x: 60, y: 55, magnitude: 3.0 },
      { x: 45, y: 70, magnitude: 1.8 },
      { x: 55, y: 80, magnitude: 2.4 },
    ],
    connections: [
      { from: 0, to: 1 }, { from: 0, to: 2 },
      { from: 1, to: 3 }, { from: 2, to: 4 },
      { from: 3, to: 5 }, { from: 4, to: 5 },
      { from: 5, to: 6 },
    ],
    hints: [
      'この星座には全天で最も明るい恒星があります。',
      '冬の大三角を構成する星を含んでいます。',
      'オリオンの忠実な従者として描かれています。',
      '大きな犬を表す星座です。',
    ],
    keywords: ['おおいぬ', 'オオイヌ', '大犬', 'シリウス', '冬の大三角'],
    area: { x: 22, y: 50, width: 14, height: 20 },
  },
  {
    id: 'sagittarius',
    name: 'いて座',
    nameKanji: '射手座',
    latin: 'Sagittarius',
    abbreviation: 'Sgr',
    season: '夏',
    category: '黄道十二星座',
    magnitude: 1.8,
    mythology: 'ケンタウロスの賢者ケイロン。医術や音楽に優れ、多くの英雄を育てました。ヘラクレスの矢が誤って当たり、不死を捨てて天に上がりました。',
    findingTip: '夏の南の空低く、さそり座の東に「南斗六星」を探しましょう。',
    brightestStar: 'カウス・アウストラリス',
    stars: [
      { x: 40, y: 50, magnitude: 2.0 },
      { x: 50, y: 45, magnitude: 1.8 },
      { x: 55, y: 55, magnitude: 2.7 },
      { x: 45, y: 60, magnitude: 2.6 },
      { x: 50, y: 35, magnitude: 2.8 },
      { x: 60, y: 40, magnitude: 2.0 },
      { x: 35, y: 30, magnitude: 2.1 },
      { x: 30, y: 65, magnitude: 3.1 },
    ],
    connections: [
      { from: 0, to: 1 }, { from: 1, to: 2 },
      { from: 2, to: 3 }, { from: 3, to: 0 },
      { from: 1, to: 4 }, { from: 4, to: 5 },
      { from: 0, to: 6 }, { from: 3, to: 7 },
    ],
    hints: [
      '「南斗六星」と呼ばれる柄杓型の星の並びが特徴です。',
      '天の川の最も濃い部分にある星座です。',
      '黄道十二星座の一つで、弓を引く姿で描かれます。',
      '半人半馬のケンタウロスが弓を射る星座です。',
    ],
    keywords: ['いて', 'イテ', '射手', '南斗六星', 'ケンタウロス'],
    area: { x: 22, y: 55, width: 16, height: 16 },
  },
  {
    id: 'andromeda',
    name: 'アンドロメダ座',
    nameKanji: 'アンドロメダ座',
    latin: 'Andromeda',
    abbreviation: 'And',
    season: '秋',
    category: '北天',
    magnitude: 2.1,
    mythology: 'エチオピアの王女アンドロメダ。母カシオペヤの傲慢さへの罰として海の怪物の生贄にされましたが、ペルセウスに救われました。',
    findingTip: 'ペガススの大四辺形の北東の角から星が連なっています。アンドロメダ銀河（M31）も見つかります。',
    brightestStar: 'アルフェラッツ',
    stars: [
      { x: 20, y: 45, magnitude: 2.1 },   // アルフェラッツ
      { x: 35, y: 40, magnitude: 2.1 },
      { x: 55, y: 35, magnitude: 2.1 },
      { x: 75, y: 38, magnitude: 3.3 },
      { x: 40, y: 55, magnitude: 3.6 },
      { x: 60, y: 50, magnitude: 3.4 },
    ],
    connections: [
      { from: 0, to: 1 }, { from: 1, to: 2 },
      { from: 2, to: 3 }, { from: 1, to: 4 },
      { from: 2, to: 5 },
    ],
    hints: [
      'この星座の近くには肉眼で見える有名な銀河があります。',
      'ペガススの大四辺形から続く、秋の星座です。',
      'ギリシャ神話で海の怪物から救われた王女の星座です。',
      'ペルセウスに助けられたエチオピアの王女の名前がついています。',
    ],
    keywords: ['アンドロメダ', 'あんどろめだ', 'アンドロメダ銀河'],
    area: { x: 55, y: 8, width: 18, height: 14 },
  },
]

/**
 * Get n random constellations from the list.
 * If n >= total, returns shuffled copy of all constellations.
 */
export function getRandomConstellations(n: number): Constellation[] {
  const shuffled = [...constellations].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(n, shuffled.length))
}
