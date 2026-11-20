import styles from './HomePage.module.css'
import { roomItems } from './roomItems.js'

export default function Room({ wallImage, floorImage, floorRef }) {
  const wallItem = roomItems.wall.find((item) =>
    item.variants.some((variant) => variant.image === wallImage)
  )
  const showBaseboard = wallItem?.showBaseboard !== false

  return (
    <>
      <div
        className={styles.wall}
        style={{ '--wall-image': `url("${wallImage}")` }}
        aria-hidden="true"
      />
      <div
        ref={floorRef}
        className={styles.floor}
        style={{ '--floor-image': `url("${floorImage}")` }}
        data-show-baseboard={showBaseboard}
        aria-hidden="true"
      />
    </>
  )
}