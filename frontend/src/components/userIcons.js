// ユーザーのアイコン5種（users.icon の値）。画像がまだないので、キャラと同じ線画の SVG で描く（UserIcon.jsx）。
// （docs/decisions.md【仮】。画像ができたらここと UserIcon.jsx を差し替える）
//   kind: 描き方 / background: 丸の地の色 / color: 人物の服の色
export const USER_ICONS = [
  { key: 'person_blue', label: '人物（青）', kind: 'person', background: '#dcebf9', color: '#8fb8e6' },
  { key: 'person_pink', label: '人物（ピンク）', kind: 'person', background: '#fbe3e8', color: '#eea6b7' },
  { key: 'person_green', label: '人物（緑）', kind: 'person', background: '#e2f2d7', color: '#9fcd85' },
  { key: 'cat', label: 'ねこ', kind: 'cat', background: '#fdedcc' },
  { key: 'penguin', label: 'ペンギン', kind: 'penguin', background: '#dcebf9' },
]
