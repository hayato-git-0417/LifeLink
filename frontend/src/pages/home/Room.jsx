// ホームの部屋（背景のイラスト）。キャラと同じ線画で、窓・時計・額・観葉植物・床を描く。
// 昼と夜（睡眠中）の色は HomePage.module.css の .room / .night の変数で切り替える。時計は今の時刻を指す。
// 飾りなので読み上げない
import { useEffect, useState } from 'react'
import styles from './HomePage.module.css'

export default function Room() {
  return (
    <div className={styles.decor} aria-hidden="true">
      <div className={styles.floor} />
      <Window />
      <Clock />
      <PictureFrame />
      <Plant />
    </div>
  )
}

function Window() {
  return (
    <svg className={styles.window} viewBox="0 0 120 160">
      <g className={styles.ink}>
        <rect x="14" y="16" width="92" height="120" rx="9" className={styles.paperFill} />
        {/* ガラスの向こう */}
        <rect x="19" y="21" width="82" height="110" rx="5" className={styles.sky} strokeWidth="2.5" />
        <path d="M19 96h82v30a5 5 0 0 1-5 5H24a5 5 0 0 1-5-5Z" className={styles.skyLow} stroke="none" />
        <path d="M19.5 117c10-11 26-13 40-5 10-7 27-8 41 1v13a5 5 0 0 1-5 5H24.5a5 5 0 0 1-5-5Z" className={styles.hill} strokeWidth="2.2" />
        <path d="M28 54c0-3.8 3.4-6.2 6.8-5.3 1.4-3.4 4.9-4.9 8.3-3.9 2.9.8 4.7 3.3 4.9 5.9 2.9 0 4.9 1.9 4.9 4.3H28Z" className={styles.cloud} strokeWidth="2" />
        <g className={styles.nightOnly} stroke="none">
          <circle cx="78" cy="44" r="9" className={styles.moon} />
          <circle cx="83" cy="40.5" r="8" className={styles.sky} />
          <path d="M38 40l1.4 3.2 3.2 1.4-3.2 1.4L38 49.2l-1.4-3.2-3.2-1.4 3.2-1.4Z" className={styles.star} />
          <path d="M55 62l1 2.2 2.2 1-2.2 1-1 2.2-1-2.2-2.2-1 2.2-1Z" className={styles.star} />
          <path d="M88 70l.8 1.8 1.8.8-1.8.8-.8 1.8-.8-1.8-1.8-.8 1.8-.8Z" className={styles.star} />
        </g>
        {/* 窓の桟 */}
        <rect x="57.5" y="21" width="5" height="110" className={styles.paperFill} strokeWidth="2" />
        <rect x="19" y="72.5" width="82" height="5" className={styles.paperFill} strokeWidth="2" />
        <rect x="8" y="133" width="104" height="9" rx="4" className={styles.paperFill} />
        {/* カーテン */}
        <path d="M4 10h112" />
        <Curtain />
        <g transform="matrix(-1 0 0 1 120 0)">
          <Curtain />
        </g>
        <circle cx="4" cy="10" r="3.5" className={styles.paperFill} strokeWidth="2.4" />
        <circle cx="116" cy="10" r="3.5" className={styles.paperFill} strokeWidth="2.4" />
      </g>
    </svg>
  )
}

function Curtain() {
  return (
    <>
      <path d="M6 12H30C31 40 23 62 27 84C30 102 37 114 35 134C26 140 15 141 6 138Z" className={styles.curtain} />
      <path d="M13.5 16c-1 20 1 42 0 62M21 16c1 18-2 40 0 64M14 94c-1 14 2 26 0 40M23 94c2 13 3 25 2 39" fill="none" strokeWidth="1.6" />
      <rect x="4" y="81" width="27" height="7" rx="3.5" className={styles.paperFill} strokeWidth="2.2" />
    </>
  )
}

// 今の時刻を指す時計（20秒ごとに読み直す）
function useClockTime() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 20000)
    return () => clearInterval(timer)
  }, [])
  return now
}

function Clock() {
  const now = useClockTime()
  const minutes = now.getMinutes()
  const hours = (now.getHours() % 12) + minutes / 60
  return (
    <svg className={styles.clock} viewBox="0 0 64 64">
      <g className={styles.ink}>
        <circle cx="32" cy="32" r="28" className={styles.paperFill} strokeWidth="3.5" />
        <circle cx="32" cy="32" r="22.5" fill="none" className={styles.clockRing} strokeWidth="1.6" />
        {[0, 90, 180, 270].map((angle) => (
          <path key={angle} d="M32 12.5v4.5" transform={`rotate(${angle} 32 32)`} strokeWidth="3" />
        ))}
        {[30, 60, 120, 150, 210, 240, 300, 330].map((angle) => (
          <path key={angle} d="M32 14v1.8" transform={`rotate(${angle} 32 32)`} strokeWidth="2.2" />
        ))}
        <path d="M32 32V20.5" transform={`rotate(${hours * 30} 32 32)`} strokeWidth="3.8" />
        <path d="M32 32V15.5" transform={`rotate(${minutes * 6} 32 32)`} strokeWidth="2.6" />
        <circle cx="32" cy="32" r="2.8" className={styles.inkFill} stroke="none" />
      </g>
    </svg>
  )
}

// 壁の額（中は若葉の絵）
function PictureFrame() {
  return (
    <svg className={styles.picture} viewBox="0 0 60 52">
      <g className={styles.ink}>
        <path d="M18 13 30 3l12 10" fill="none" strokeWidth="1.6" />
        <rect x="6" y="12" width="48" height="38" rx="4" className={styles.frameWood} strokeWidth="3" />
        <rect x="12" y="18" width="36" height="26" rx="2" className={styles.paperFill} strokeWidth="2" />
        <path d="M30 38.5v-8.5M23 39.5h14" fill="none" strokeWidth="2" />
        <path d="M30 30.5c-.5-4-3.6-6.4-8-6 .3 4.2 3.5 6.6 8 6ZM30 30.5c.5-4 3.6-6.4 8-6-.3 4.2-3.5 6.6-8 6Z" className={styles.leafA} strokeWidth="1.8" />
        <circle cx="30" cy="3" r="1.8" className={styles.inkFill} stroke="none" />
      </g>
    </svg>
  )
}

function Plant() {
  return (
    <svg className={styles.plant} viewBox="0 0 100 150">
      <g className={styles.ink}>
        <path
          d="M50 100C49 84 44 70 34 58M50 100c1-18 6-34 18-46M50 100c0-22-1-44-2-62M50 100c-6-10-14-16-26-18M50 100c6-8 15-13 27-14"
          fill="none"
          strokeWidth="2.6"
        />
        <path d="M34 58c-13-2-21-12-21-26 13 1 22 11 21 26Z" className={styles.leafA} />
        <path d="M68 54c2-14 12-22 25-21-1 14-11 22-25 21Z" className={styles.leafB} />
        <path d="M48 38c-8-10-8-24 1-34 9 10 8 24-1 34Z" className={styles.leafB} />
        <path d="M24 82C12 85 3 79 0 68c12-3 21 2 24 14Z" className={styles.leafB} />
        <path d="M77 86c11 4 20 0 23-11-11-4-20 0-23 11Z" className={styles.leafA} />
        <path d="M33 56C27 50 19 43 15 35M70 52c5-6 12-12 21-17M48.5 36V8M22 80C15 77 8 73 3 69M79 84c6-2 12-5 19-8" fill="none" strokeWidth="1.6" />
        <path d="M27 108h46l-6 38H33Z" className={styles.pot} />
        <rect x="22" y="98" width="56" height="13" rx="5" className={styles.potRim} />
      </g>
    </svg>
  )
}
