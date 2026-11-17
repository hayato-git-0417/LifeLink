import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppShell from '../../components/AppShell.jsx'
import Room from './Room.jsx'
import styles from './HomePage.module.css'
import shellStyles from '../../components/AppShell.module.css'
import { BackIcon } from '../../components/icons.jsx'
import customizeStyles from './HomeCustomizePage.module.css'

export default function RoomEditPage({
  wallImage,
  floorImage,
  placedFurniture,
  onSaveFurniture,
  hasUnsavedFurnitureChanges,
  roomPresets,
  onSaveRoomPreset,
  onRemoveRoomPreset,
  onApplyRoomPreset,
  onRenameRoomPreset,
}) {

  const navigate = useNavigate()

  const presetDialogRef = useRef(null)
  const [presetName, setPresetName] = useState('')
  const [presetError, setPresetError] = useState('')
  const [selectedPresetName, setSelectedPresetName] = useState(null)
  const selectedPreset = roomPresets.find(
    (preset) => preset.name === selectedPresetName
  )
  const presetNameDialogRef = useRef(null)
  const [renamingPresetName, setRenamingPresetName] = useState(null)

  return (
    <AppShell bare>
      <div className={styles.room}>
        <Room wallImage={wallImage} floorImage={floorImage} />

        {placedFurniture.map((item) => (
          <Link
            key={item.placementId}
            to="/home/customize/place"
            state={item}
            aria-label={`${item.name}を移動`}
            style={{
              position: 'absolute',
              left: `${item.x}%`,
              top: `${item.y}%`,
              width: item.displayWidth ?? 'min(30%, 160px)',
              transform: 'translate(-50%, -100%)',
            }}
          >
            <img
              src={item.image}
              alt=""
              draggable={false}
              style={{ display: 'block', width: '100%', height: 'auto' }}
            />
          </Link>
        ))}

        <Link
          to="/"
          className={shellStyles.roundButton}
          aria-label="ホームに戻る"
          style={{ position: 'absolute', top: 12, left: 12, zIndex: 2 }}
          onClick={(event) => {
            if (
              hasUnsavedFurnitureChanges &&
              !window.confirm('変更を破棄して、ホームに戻りますか？')
            ) {
              event.preventDefault()
            }
          }}
        >
          <BackIcon size={22} />
        </Link>

        <button
          type="button"
          className={`${styles.button} ${styles.roomPresetButton}`}
          onClick={() => {
            setPresetError('')
            presetDialogRef.current.showModal()
          }}
        >
          プリセット
        </button>

        <dialog
          ref={presetDialogRef}
          aria-labelledby="room-preset-title"
          className={customizeStyles.colorDialog}
          onClose={() => {
            setPresetName('')
            setPresetError('')
            setSelectedPresetName(null)
          }} 
        >
        <h2 id="room-preset-title">部屋のプリセット</h2>
          
        <ul className={`${customizeStyles.colorList} ${styles.presetGrid}`}>
          {roomPresets.map((preset) => (
            <li key={preset.name} className={`${customizeStyles.colorOption} ${styles.presetCard}`}>

              <div className={styles.presetPreviewTarget}>
                {/* 部屋プレビュー */}
                <div className={`${styles.room} ${styles.presetRoom}`} aria-hidden="true">
                  <Room wallImage={preset.wallImage} floorImage={preset.floorImage} />
                  {preset.furniture.map((item) => (
                    <img
                      key={item.placementId}
                      className={styles.presetFurniture}
                      src={item.image}
                      alt=""
                      style={{
                        left: `${item.x}%`,
                        top: `${item.y}%`,
                        width: item.displayWidth ?? 'min(30%, 160px)',
                      }}
                    />
                  ))}
                </div>

                {/* プリセットカードの部屋画像をタップする部分 */}
                <button
                  type="button"
                  className={styles.presetApplyButton}
                  aria-label={`${preset.name}を選択`}
                  aria-pressed={selectedPresetName === preset.name}
                  onClick={() => {
                    setSelectedPresetName((current) =>
                      current === preset.name ? null : preset.name
                    )
                    setPresetError('')
                  }}
                />
              </div>

              {/* 名前の変更 */}
              <button
                type="button"
                className={styles.presetApplyButton}
                aria-label={`${preset.name}の名前を変更`}
                onClick={() => {
                  setRenamingPresetName(preset.name)
                  setPresetName(preset.name)
                  setPresetError('')
                  presetNameDialogRef.current.showModal()
                }}
              >
                {preset.name}
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              className={`${customizeStyles.colorOption} ${styles.presetNewCard}`}
              onClick={() => {
                setRenamingPresetName(null)
                setSelectedPresetName(null)
                setPresetName('')
                setPresetError('')
                presetNameDialogRef.current.showModal()
              }}
            >
              <span aria-hidden="true">＋</span>
              <span>新規作成</span>
            </button>
          </li>
        </ul>

        {presetError && <p role="alert">{presetError}</p>}

        <div className={styles.presetActions}>
          {selectedPreset ? (
            <>
              <button
                type="button"
                className={`${styles.button} ${styles.roomEditAction}`}
                onClick={() => {
                  onApplyRoomPreset(selectedPreset)
                  presetDialogRef.current.close()
                }}
              >
                適用
              </button>
              <button
                type="button"
                className={`${styles.button} ${styles.roomEditAction} ${styles.removeAction}`}
                onClick={() => {
                  const error = onRemoveRoomPreset(selectedPreset.name)
                  setPresetError(error)
                  if (!error) setSelectedPresetName(null)
                }}
              >
                削除
              </button>
            </>
            ) : (
            <>
              <button
                type="button"
                className={`${styles.button} ${styles.roomEditAction} ${styles.roomSaveButton}`}
                onClick={() => presetDialogRef.current.close()}
              >
                閉じる
              </button>
            </>
            )}
          </div>
        </dialog>

        <dialog
          ref={presetNameDialogRef}
          className={customizeStyles.colorDialog}
          aria-labelledby="preset-name-title"
          onClose={() => {
            setRenamingPresetName(null)
            setPresetName('')
            setPresetError('')
          }}
        >
          <h2 id="preset-name-title" className={customizeStyles.dialogTitle}>
            {renamingPresetName === null ? 'プリセットを保存' : 'プリセット名を変更'}
          </h2>

            <form
              onSubmit={(event) => {
                event.preventDefault()

                const error = renamingPresetName === null
                  ? onSaveRoomPreset(presetName)
                  : onRenameRoomPreset(renamingPresetName, presetName)

                setPresetError(error)
                if (error) return

                if (renamingPresetName !== null && selectedPresetName === renamingPresetName) {
                  setSelectedPresetName(presetName.trim())
                }

                presetNameDialogRef.current.close()
              }}
            >

            <label className={styles.presetNameField}>
              <input
                value={presetName}
                onChange={(event) => setPresetName(event.target.value)}
                maxLength={30}
                placeholder="プリセット名"
                required
              />
            </label>

            {presetError && <p role="alert">{presetError}</p>}

            <div className={styles.presetActions}>
              <button
                type="button"
                className={`${styles.button} ${styles.roomEditAction} ${styles.roomSaveButton}`}
                onClick={() => presetNameDialogRef.current.close()}
              >
                キャンセル
              </button>
              <button
                type="submit"
                className={`${styles.button} ${styles.roomEditAction}`}
              >
                保存
              </button>
            </div>
          </form>
        </dialog>
        
        {/* 家具追加 */}
        <div className={styles.roomEditActions}>
          <Link
            to="/home/customize"
            className={`${styles.button} ${styles.roomEditAction}`}
          >
            家具を追加
          </Link>

          <button
            type="button"
            className={`${styles.button} ${styles.roomEditAction} ${styles.roomSaveButton}`}
            onClick={() => {
              onSaveFurniture()
              navigate('/', { replace: true })
            }}
            
          >
            保存
          </button>
        </div>

      </div>
    </AppShell>
  )
}