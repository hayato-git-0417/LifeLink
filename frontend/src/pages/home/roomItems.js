export const roomItems = {
  wall: [
    {
      id: 'stripe',
      name: 'ストライプ',
      variants: [
        { name: 'クリーム', image: '/room/wall/cream-stripe.png' },
        { name: 'ブルー', image: '/room/wall/blue-stripe.png' },
        { name: 'グリーン', image: '/room/wall/green-stripe.png' },
        { name: 'ピンク', image: '/room/wall/pink-stripe.png' },
      ],
    },
    {
      id: 'log',
      name: 'ログハウス',
      showBaseboard: false,
      variants: [
        { name: 'ナチュラル', image: '/room/wall/log-natural.png' },
        { name: 'ダーク', image: '/room/wall/log-dark.png' },
        { name: 'レッド', image: '/room/wall/log-red.png' },
        { name: 'クリーム', image: '/room/wall/log-cream.png' },
      ],
    },
    {
      id: 'concrete',
      name: 'コンクリート',
      showBaseboard: false,
      variants: [
        { name: 'ベーシック', image: '/room/wall/concrete.png' },
      ],
    },
    {
      id: 'sky',
      name: '青い空',
      variants: [
        { name: '青い空', image: '/room/wall/sky.png' },
      ],
    },
    {
      id: 'brick',
      name: 'レンガ',
      variants: [
        { name: '赤いレンガ', image: '/room/wall/brick-red.png' },
        { name: '白いレンガ', image: '/room/wall/brick-white.png' },
      ],
    },
    {
      id: 'mountain',
      name: '山の背景',
      showBaseboard: false,
      variants: [
        { name: '山の背景', image: '/room/wall/mountain.png' },
      ],
    },
    {
      id: 'yakei',
      name: 'ビルの夜景',
      showBaseboard: false,
      variants: [
        { name: 'ビルの夜景', image: '/room/wall/yakei.png' },
      ],
    },
  ],

  floor: [
    {
      id: 'wood',
      name: '木の床',
      variants: [
        { name: 'ナチュラル', image: '/room/floor/log-natural.png' },
        { name: 'ダーク', image: '/room/floor/log-dark.png' },
        { name: 'レッド', image: '/room/floor/log-red.png' },
        { name: 'クリーム', image: '/room/floor/log-cream.png' },
      ],
    },
    {
      id: 'tatami',
      name: '畳',
      variants: [
        { name: 'ベーシック', image: '/room/floor/tatami.png' },
      ],
    },
    {
      id: 'marble',
      name: '大理石',
      variants: [
        { name: 'ホワイト', image: '/room/floor/marble-white.png' },
        { name: 'ブラック', image: '/room/floor/marble-black.png' },
      ],
    },
    {
      id: 'grass',
      name: '芝生',
      variants: [
        { name: '芝生', image: '/room/floor/grass.png' },
      ],
    },
    {
      id: 'herringbone_wood',
      name: 'ヘリンボーンの木床',
      variants: [
        { name: 'ヘリンボーンの木床', image: '/room/floor/herringbone_wood-natural.png' },
      ],
    },
  ],

  /* 家具 */
  chair: [
    {
      id: 'sofa',
      name: 'シンプルなソファ',
      placement: 'floor',
      displayWidth: 'min(85%, 260px)',
      stackSurface: 'seat',
      stackOn: ['rug'],
      variants: [
        { name: 'クリーム', image: '/room/chair/sofa-cream.png' },
      ],
    },
    {
      id: 'sofa-country',
      name: 'カントリーなソファ',
      placement: 'floor',
      displayWidth: 'min(85%, 260px)',
      stackSurface: 'seat',
      stackArea: { left: 0.15, right: 0.85, top: 0.55, bottom: 0.63 },
      stackOn: ['rug'],
      variants: [
        { name: 'グリーン', image: '/room/chair/sofa2-green.png' },
      ],
    },

    {
      id: 'chair-blue',
      name: '青い椅子',
      placement: 'floor',
      displayWidth: 'min(25%, 260px)',
      stackSurface: 'seat',
      stackArea: { left: 0.15, right: 0.85, top: 0.55, bottom: 0.63 },
      stackOn: ['rug'],
      variants: [
        { name: 'グリーン', image: '/room/chair/chair-blue.png' },
      ],
    },
  ],
  closet: [
    {
      id: 'closet',
      name: 'シンプルなクローゼット',
      placement: 'floor',
      displayWidth: 'min(45%, 240px)',
      stackOn: ['rug'],
      variants: [
        { name: 'ベーシック', image: '/room/closet/closet1.png' },
      ],
    },
  ],
  plant: [
    {
      id: 'plant',
      name: '植物',
      placement: 'floor',
      displayWidth: 'min(20%, 240px)',
      stackOn: ['seat', 'tabletop', 'rug'],
      variants: [
        { name: 'A', image: '/room/plant/plant1.png' },
        { name: 'B', image: '/room/plant/plant2.png' },
        { name: 'C', image: '/room/plant/plant3.png' },
      ],
    },
  ],

  rug: [
    {
      id: 'rug',
      name: '敷物',
      placement: {minY: 0, maxY: 27,},
      displayWidth: 'min(60%, 240px)',
      stackSurface: 'rug',
      stackArea: { left: 0.0, right: 1.0, top: 0.0, bottom: 1.0 },
      variants: [
        { name: '丸いラグ', image: '/room/rug/rug1.png' },
        { name: '四角いラグ', image: '/room/rug/rug2.png' },
        { name: '曇のラグ', image: '/room/rug/rug3.png' },
      ],
    },
  ],

  table: [
    {
      id: 'side_table',
      name: 'サイドテーブル',
      displayWidth: 'min(20%, 240px)',
      stackSurface: 'tabletop',
      stackArea: { left: 0.3, right: 0.8, top: 0.15, bottom: 0.27 },
      placement: {minY: 0, maxY: 27,},
      variants: [
        { name: '丸いサイドテーブル', image: '/room/table/side_table.png' },
      ],
    },
    {
      id: 'square_side_table',
      name: '四角いサイドテーブル',
      displayWidth: 'min(20%, 240px)',
      stackSurface: 'tabletop',
      stackArea: { left: 0.3, right: 0.8, top: 0.15, bottom: 0.27 },
      placement: {minY: 0, maxY: 27,},
      variants: [
        { name: '四角いサイドテーブル', image: '/room/table/square_side_table.png' },
      ],
    },
  ],

  ornament: [
    {
      id: 'christmas_tree',
      name: 'クリスマスツリー',
      placement: {minY: 23, maxY: 27,},
      displayWidth: 'min(50%, 240px)',
      variants: [
        { name: 'A', image: '/room/ornament/christmas_tree.png' },
      ],
    },
    {
      id: 'fireplace',
      name: '暖炉',
      placement: {minY: 25, maxY: 27,},
      displayWidth: 'min(70%, 240px)',
      stackSurface: 'tabletop',
      stackArea: { left: 0.1, right: 0.9, top: 0.08, bottom: 0.13 },
      variants: [
        { name: 'A', image: '/room/ornament/fireplace.png' },
      ],
    },
    {
      id: 'gift_box',
      name: 'プレゼント',
      placement: {minY: 1, maxY: 27,},
      displayWidth: 'min(30%, 240px)',
      stackOn: ['rug'],
      variants: [
        { name: 'A', image: '/room/ornament/gift_box1.png' },
        { name: 'B', image: '/room/ornament/gift_box2.png' },
        { name: 'C', image: '/room/ornament/gift_box3.png' },
      ],
    },
    {
      id: 'christmas_stockings',
      name: 'クリスマスの靴下',
      placement: {minY: 30, maxY: 100,},
      displayWidth: 'min(15%, 240px)',
      variants: [
        { name: 'A', image: '/room/ornament/christmas_stockings.png' },
      ],
    },
    {
      id: 'christmas_wreath',
      name: 'クリスマスのリース',
      placement: {minY: 30, maxY: 100,},
      displayWidth: 'min(20%, 240px)',
      variants: [
        { name: 'A', image: '/room/ornament/christmas_wreath.png' },
      ],
    },
    {
      id: 'snow_globe',
      name: ' スノードーム',
      placement: {minY: 1, maxY: 27,},
      displayWidth: 'min(10%, 240px)',
      stackOn: ['seat', 'tabletop', 'rug'],
      variants: [
        { name: 'A', image: '/room/ornament/snow_globe.png' },
      ],
    },
    {
      id: 'pc',
      name: ' ゲーミングPC',
      placement: {minY: 1, maxY: 27,},
      displayWidth: 'min(100%, 240px)',
      stackOn: ['rug'],
      variants: [
        { name: 'A', image: '/room/ornament/pc.png' },
      ],
    },
  ],
}