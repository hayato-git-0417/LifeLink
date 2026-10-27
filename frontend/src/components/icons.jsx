// 線画のアイコン（キャラと同じ、角の丸い線）。色は currentColor、大きさは size（px）。
// 飾りとして使うので読み上げない（意味はボタンの文字や aria-label で伝える）
//   <MealIcon size={28} />
function Icon({ size = 24, strokeWidth = 2, fill = 'none', className, children }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={fill}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

// --- 4つの項目（色は使う側で決める） ---
export function MealIcon(props) {
  return (
    <Icon {...props}>
      <path d="M5.5 3v5.5a2.6 2.6 0 0 0 5.2 0V3M8.1 3v18" />
      <path d="M18 21V3c-2.3 1.3-3.6 4-3.6 7.6 0 1.6.9 2.6 3.6 2.6" />
    </Icon>
  )
}

export function WorkIcon(props) {
  return (
    <Icon {...props}>
      <path d="M3 6c3-1.6 6.2-1.6 9 .6 2.8-2.2 6-2.2 9-.6v13c-3-1.6-6.2-1.6-9 .6-2.8-2.2-6-2.2-9-.6V6Z" />
      <path d="M12 6.6v13M6 9.6c1.3-.4 2.5-.3 3.6.3M14.4 9.9c1.1-.6 2.3-.7 3.6-.3M6 12.8c1.3-.4 2.5-.3 3.6.3M14.4 13.1c1.1-.6 2.3-.7 3.6-.3" />
    </Icon>
  )
}

export function ExerciseIcon(props) {
  return (
    <Icon {...props}>
      <rect x="5" y="6.5" width="3.4" height="11" rx="1.2" />
      <rect x="15.6" y="6.5" width="3.4" height="11" rx="1.2" />
      <path d="M2.8 10v4M21.2 10v4M8.4 12h7.2" />
    </Icon>
  )
}

export function SleepIcon(props) {
  return (
    <Icon {...props}>
      <path d="M3 5.5v14M21 13.5v6M3 17h18M3 13.5h18" />
      <path d="M10.6 13.5v-2.6a1.9 1.9 0 0 1 1.9-1.9h5.2a3.3 3.3 0 0 1 3.3 3.3v1.2" />
      <rect x="5" y="9.6" width="3.9" height="3.9" rx="1.3" />
    </Icon>
  )
}

// --- 画面の部品 ---
export function BackIcon(props) {
  return (
    <Icon strokeWidth={2.4} {...props}>
      <path d="M19 12H5.5M11 6l-6 6 6 6" />
    </Icon>
  )
}

export function BellIcon(props) {
  return (
    <Icon fill="currentColor" strokeWidth={1.6} {...props}>
      <path d="M12 3.4c-3.3 0-6 2.7-6 6v4.3l-1.6 2.9h15.2L18 13.7V9.4c0-3.3-2.7-6-6-6Z" />
      <path d="M9.7 18.9a2.3 2.3 0 0 0 4.6 0" fill="none" strokeWidth={2.2} />
    </Icon>
  )
}

export function MenuIcon(props) {
  return (
    <Icon strokeWidth={2.4} {...props}>
      <path d="M4.5 7h15M4.5 12h15M4.5 17h15" />
    </Icon>
  )
}

export function HomeIcon(props) {
  return (
    <Icon {...props}>
      <path d="M4 11 12 4.5 20 11v8.5a1 1 0 0 1-1 1h-4.5V15h-5v5.5H5a1 1 0 0 1-1-1V11Z" />
    </Icon>
  )
}

export function PersonIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="8.5" r="3.8" />
      <path d="M4.8 20.5c.6-3.9 3.6-6.3 7.2-6.3s6.6 2.4 7.2 6.3" />
    </Icon>
  )
}

export function SunIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
    </Icon>
  )
}

export function MoonIcon(props) {
  return (
    <Icon {...props}>
      <path d="M19.5 14.6A7.8 7.8 0 1 1 9.4 4.5a6.2 6.2 0 0 0 10.1 10.1Z" />
    </Icon>
  )
}

export function SproutIcon(props) {
  return (
    <Icon {...props}>
      <path d="M12 20.5v-8M7.5 20.5h9" />
      <path d="M12 12.5C11.5 8.8 8.6 6.6 4.5 7c.3 3.9 3.3 6 7.5 5.5ZM12 12.5c.5-3.7 3.4-5.9 7.5-5.5-.3 3.9-3.3 6-7.5 5.5Z" />
    </Icon>
  )
}

export function CameraIcon(props) {
  return (
    <Icon {...props}>
      <path d="M4.5 7.5h3.1l1.6-2.3h5.6l1.6 2.3h3.1A1.5 1.5 0 0 1 21 9v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18V9a1.5 1.5 0 0 1 1.5-1.5Z" />
      <circle cx="12" cy="13.2" r="3.6" />
    </Icon>
  )
}

export function ListIcon(props) {
  return (
    <Icon {...props}>
      <path d="M9.5 6.5h10M9.5 12h10M9.5 17.5h10" />
      <path d="M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01" strokeWidth={3.2} />
    </Icon>
  )
}

export function FlagIcon(props) {
  return (
    <Icon {...props}>
      <path d="M5.5 21V3.8" />
      <path d="M5.5 4.5h12l-2.6 4 2.6 4h-12" />
    </Icon>
  )
}

export function DoorIcon(props) {
  return (
    <Icon {...props}>
      <path d="M13.5 4h-7A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20h7" />
      <path d="M10.5 12h10M17 8.5l3.5 3.5-3.5 3.5" />
    </Icon>
  )
}

export function SlidersIcon(props) {
  return (
    <Icon {...props}>
      <path d="M4 7h9M17.4 7H20M4 17h2.6M11.4 17H20" />
      <circle cx="15.2" cy="7" r="2.2" />
      <circle cx="9" cy="17" r="2.2" />
    </Icon>
  )
}

export function ChartIcon(props) {
  return (
    <Icon {...props}>
      <path d="M3.5 20.5h17M6.5 20.5v-7M12 20.5V6M17.5 20.5v-10" />
    </Icon>
  )
}

export function PlusIcon(props) {
  return (
    <Icon strokeWidth={2.4} {...props}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  )
}

export function CloseIcon(props) {
  return (
    <Icon strokeWidth={2.4} {...props}>
      <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
    </Icon>
  )
}

export function ChevronLeftIcon(props) {
  return (
    <Icon strokeWidth={2.4} {...props}>
      <path d="M14.5 5.5 8 12l6.5 6.5" />
    </Icon>
  )
}

export function ChevronRightIcon(props) {
  return (
    <Icon strokeWidth={2.4} {...props}>
      <path d="M9.5 5.5 16 12l-6.5 6.5" />
    </Icon>
  )
}

export function CheckIcon(props) {
  return (
    <Icon strokeWidth={2.8} {...props}>
      <path d="M5 12.5 10 17.5 19.5 7" />
    </Icon>
  )
}

export function SearchIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="10.8" cy="10.8" r="6.3" />
      <path d="M15.5 15.5 20 20" />
    </Icon>
  )
}

export function ClockIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </Icon>
  )
}

// 移動距離（道のり）
export function RouteIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="6" cy="18" r="2.2" />
      <circle cx="18" cy="6" r="2.2" />
      <path d="M8.2 18h6.3a3 3 0 0 0 0-6h-5a3 3 0 0 1 0-6h6.3" />
    </Icon>
  )
}

// 継続日数の炎（ここだけ色つき）
export function FlameIcon(props) {
  return (
    <Icon strokeWidth={1.6} {...props}>
      <path
        d="M12 21.2c-3.7 0-6.2-2.5-6.2-5.8 0-3.3 2.4-4.9 3.4-7.9.5 1.7 1.5 2.7 2.5 3.1.2-2.9 1.6-5.5 3.6-7.4.2 3.4 2.9 5.5 2.9 10.1 0 4.4-2.6 7.9-6.2 7.9Z"
        fill="#f4a259"
      />
      <path d="M12 20.4c-1.6 0-2.7-1.1-2.7-2.6 0-1.6 1.3-2.4 1.8-3.8.8 1 1.6 1.2 2.1 1.2.2-.9.5-1.5 1-2.1.7 1.3 1.1 2.4 1.1 3.9 0 2-1.4 3.4-3.3 3.4Z" fill="#fde3a0" />
    </Icon>
  )
}
