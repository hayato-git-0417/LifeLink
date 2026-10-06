// ユーザーのアイコン5種（users.icon の値）。画像がまだないので、人物は SVG の色、ねこ・ペンギンは絵文字で代用する
// （docs/decisions.md【仮】。画像ができたらここと UserIcon.jsx を差し替える）
export const USER_ICONS = [
  { key: 'person_blue', label: '人物（青）', background: '#e8eef6', color: '#7d97c0' },
  { key: 'person_pink', label: '人物（ピンク）', background: '#fde7ee', color: '#d98ea6' },
  { key: 'person_green', label: '人物（緑）', background: '#ddf3e4', color: '#6fae86' },
  { key: 'cat', label: 'ねこ', background: '#fff1dc', emoji: '🐱' },
  { key: 'penguin', label: 'ペンギン', background: '#dcecfa', emoji: '🐧' },
]
