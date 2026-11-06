import styles from './BlockSlider.module.css'
import { useRef } from 'react'

export default function BlockSlider({
  label = '値',
  value = 0,
  min = 0,
  max = 100,
  step = 10,
  blockCount = 10,
  onChange,
}) {
const activeBlocks = Math.round(((value - min) / (max - min)) * blockCount)

const volumeBeforeMute = useRef(null)
const isMuted = value <= min

function handleMuteToggle() {
  if (isMuted) {
    onChange(volumeBeforeMute.current ?? Math.min(min + step, max))
    return
  }

  volumeBeforeMute.current = value
  onChange(min)
}

  return (
    <div className={styles.sliderControl}>
      <button
        type="button"
        aria-label={`${label}のミュート`}
        aria-pressed={isMuted}
        onClick={handleMuteToggle}
      >
        <img
          src={isMuted ? '/ui-icons/mute-on.png' : '/ui-icons/mute-off.png'}
          alt=""
        />
      </button>

      <div
        className={styles.sliderBlocks}
        style={{ '--block-count': blockCount }}
      >
        <input
          className={styles.sliderRange}
          type="range"
          aria-label={label}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(event.currentTarget.valueAsNumber)}
        />
        {Array.from({ length: blockCount }, (_, index) => (
          <span
            key={index}
            className={`${styles.sliderBlock}
              ${index < activeBlocks ? styles.sliderBlockActive : ''}
              ${index === activeBlocks - 1 ? styles.sliderBlockCurrent : ''}
            `}
          />
        ))}
      </div>
    </div>
  )
}