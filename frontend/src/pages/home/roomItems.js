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
    // {
    //   id: 'marble',
    //   name: '大理石',
    //   variants: [
    //     { name: 'ホワイト', image: '/room/floor/marble-white.png' },
    //     { name: 'ブラック', image: '/room/floor/marble-black.png' },
    //   ],
    // },
  ],

  /* 家具 */
  chair: [
    {
      id: 'sofa',
      name: 'シンプルなソファ',
      placement: 'floor',
      displayWidth: 'min(85%, 260px)',
      stackSurface: 'seat',
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
      variants: [
        { name: 'グリーン', image: '/room/chair/sofa2-green.png' },
      ],
    },
  ],
  closet: [
    {
      id: 'closet',
      name: 'シンプルなクローゼット',
      placement: 'floor',
      displayWidth: 'min(45%, 240px)',
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
      stackOn: ['seat'],
      variants: [
        { name: 'A', image: '/room/plant/plant1.png' },
        { name: 'B', image: '/room/plant/plant2.png' },
        { name: 'C', image: '/room/plant/plant3.png' },
      ],
    },
  ],
}