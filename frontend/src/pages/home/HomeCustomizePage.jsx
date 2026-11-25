import { useRef, useState } from 'react'
import AppShell from '../../components/AppShell.jsx'
import styles from './HomeCustomizePage.module.css'
import form from '../../styles/form.module.css'
import { useNavigate } from 'react-router-dom'
import { roomItems } from './roomItems.js'
import homeStyles from './HomePage.module.css'

const categoryGroups = [
  {
    label: '壁・床',
    items: [
      { id: 'wall', label: '壁' },
      { id: 'floor', label: '床' },
    ],
  },
  {
    label: '家具の種類',
    items: [
      { id: 'chair', label: '椅子' },
      { id: 'closet', label: 'クローゼット' },
      { id: 'plant', label: '植物' },
      { id: 'table', label: 'テーブル' },
      { id: 'hang', label: '壁飾り' },
      { id: 'rug', label: '敷物' },
      { id: 'chest', label: 'タンス' },
      { id: 'ornament', label: '置物' },
    ],
  },
]

export default function HomeCustomizePage({
  wallImage,
  floorImage,
  onSelectWall,
  onSelectFloor,
}) {
  const [category, setCategory] = useState('wall')
  const [colorItem, setColorItem] = useState(null)
  const colorDialogRef = useRef(null)

  const selectedImage = { wall: wallImage, floor: floorImage }[category]

  function openColorPicker(item) {
    setColorItem(item)
    colorDialogRef.current.showModal()
  }

  const navigate = useNavigate()

function handleItemSelect(item, image) {
  if (category === 'wall') {
    onSelectWall(image)
    navigate('/home/customize/edit')
    return
  }
  if (category === 'floor') {
    onSelectFloor(image)
    navigate('/home/customize/edit')
    return
  }

  if (item.placement) {
    const variant = item.variants.find((variant) => variant.image === image)
    navigate('/home/customize/place', {
      state: {
        id: item.id,
        name: item.name,
        image,
        placement: item.placement,
        displayWidth: item.displayWidth,
        stackSurface: item.stackSurface,
        stackOn: item.stackOn,
        stackArea: variant?.stackArea ?? item.stackArea,
      },
    })
    return
  }

  if (category === 'wall') onSelectWall(image)
  if (category === 'floor') onSelectFloor(image)
}

  return (
    <AppShell title="模様替え" backTo="/home/customize/edit">
      <div className={styles.categoryGroups}>
        {categoryGroups.map((group) => (
          <div
            key={group.label}
            className={styles.categoryRow}
            role="group"
            aria-label={group.label}
          >
            {group.items.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={styles.categoryButton}
                aria-pressed={category === id}
                onClick={() => setCategory(id)}
              >
                {label}
              </button>
            ))}
          </div>
        ))}
      </div>

      <ul className={styles.itemList}>
        {roomItems[category].map((item) => {
          const currentVariant = item.variants.find(
            (variant) => variant.image === selectedImage
          )
          const preview = currentVariant ?? item.variants[0]

          return (
            <li
              key={item.id}
              className={`${form.card} ${styles.itemCard}`}
              data-selected={Boolean(currentVariant)}
            >
              <button
                type="button"
                className={styles.itemButton}
                aria-pressed={Boolean(currentVariant)}
                onClick={() => handleItemSelect(item, preview.image)}
              >
                <img
                  className={styles.itemImage}
                  src={preview.image}
                  alt=""
                />
                <span className={styles.itemName}>{item.name}</span>
              </button>

              {item.variants.length > 1 && (
                <button
                  type="button"
                  className={styles.colorButton}
                  aria-label={`${item.name}の色を変更`}
                  onClick={() => openColorPicker(item)}
                >
                  色変更
                </button>
              )}
            </li>
          )
        })}
      </ul>

      <dialog
        ref={colorDialogRef}
        className={styles.colorDialog}
        aria-labelledby="color-picker-title"
        onClose={() => setColorItem(null)}
      >
        <h2 id="color-picker-title" className={styles.dialogTitle}>
          {colorItem?.name}の色
        </h2>

        <div className={styles.colorList}>
          {colorItem?.variants.map((variant) => (
            <button
              key={variant.image}
              type="button"
              className={styles.colorOption}
              aria-pressed={variant.image === selectedImage}
              onClick={() => {
                colorDialogRef.current.close()
                handleItemSelect(colorItem, variant.image)
              }}
            >
              <img src={variant.image} alt="" />
              <span>{variant.name}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          className={`${homeStyles.button} ${styles.closeButton}`}
          onClick={() => colorDialogRef.current.close()}
        >
          閉じる
        </button>
      </dialog>
      
    </AppShell>
  )
}