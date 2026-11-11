// プロフィールの入力欄（アイコン・ユーザー名・生年月日・性別）。新規登録②とプロフィール変更（p.16）で使う
//   value: { icon, name, birthdate, gender } / onChange(changes)
import { useEffect, useRef, useState } from 'react'
import { toDateString } from '../lib/format.js'
import form from '../styles/form.module.css'
import styles from './ProfileFields.module.css'
import UserIcon from './UserIcon.jsx'
import { USER_ICONS } from './userIcons.js'

const PRESET_ICONS = USER_ICONS.filter((icon) => !['sprout', 'cat', 'penguin'].includes(icon.key))

const GENDERS = [
  { value: 'male', label: '男性' },
  { value: 'female', label: '女性' },
  { value: 'other', label: 'その他' },
  { value: 'unspecified', label: '回答しない' },
]

export default function ProfileFields({ value, onChange }) {
  return (
    <>
      <section className={`${form.card} ${styles.iconCard}`}>
        <h2 className={form.cardTitle}>アイコン</h2>
        <ProfilePhotoPicker value={value} onChange={onChange} />
      </section>
      <section className={`${form.card} ${form.form}`}>
        <label className={form.field}>
          <span className={form.label}>ユーザー名</span>
          <input
            className={form.input}
            type="text"
            maxLength={50}
            placeholder="名前を入力"
            autoComplete="nickname"
            value={value.name}
            onChange={(event) => onChange({ name: event.target.value })}
          />
        </label>
        <label className={form.field}>
          <span className={form.label}>生年月日</span>
          <input
            className={`${form.input} ${styles.birthdate}`}
            type="date"
            min="1900-01-01"
            max={toDateString()}
            value={value.birthdate}
            onChange={(event) => onChange({ birthdate: event.target.value })}
          />
        </label>
        <fieldset className={`${form.field} ${styles.genderSet}`}>
          <legend className={`${form.label} ${styles.legend}`}>性別</legend>
          <div className={`${form.segmented} ${styles.genders}`}>
            {GENDERS.map((gender) => (
              <label
                key={gender.value}
                className={`${form.segment} ${styles.gender} ${value.gender === gender.value ? form.segmentActive : ''}`}
              >
                <input
                  type="radio"
                  name="gender"
                  checked={value.gender === gender.value}
                  onChange={() => onChange({ gender: gender.value })}
                />
                {gender.label}
              </label>
            ))}
          </div>
          <span className={form.hint}>食事の目標の初期値に使います</span>
        </fieldset>
      </section>
    </>
  )
}

function ProfilePhotoPicker({ value, onChange }) {
  const [previewUrl, setPreviewUrl] = useState(value.avatarUrl || null)
  const [photoError, setPhotoError] = useState('')
  const [cropFile, setCropFile] = useState(null)
  const [cropUrl, setCropUrl] = useState('')
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragStart, setDragStart] = useState(null)
  const photoInputRef = useRef(null)
  const activePhotoUrl = value.useAvatar && (value.avatar || value.avatarUrl) ? previewUrl : null

  useEffect(() => {
    if (!value.avatar) {
      setPreviewUrl(value.avatarUrl || null)
      return undefined
    }
    const objectUrl = URL.createObjectURL(value.avatar)
    setPreviewUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [value.avatar, value.avatarUrl])

  function selectPhoto(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setPhotoError('画像ファイルを選択してください')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setPhotoError('画像は10MB以下にしてください')
      return
    }
    setPhotoError('')
    setCropFile(file)
    setCropUrl(URL.createObjectURL(file))
    setZoom(1)
    setOffset({ x: 0, y: 0 })
  }

  function cancelCrop() {
    if (cropUrl) URL.revokeObjectURL(cropUrl)
    setCropUrl('')
    setCropFile(null)
    setDragStart(null)
  }

  function confirmCrop() {
    const image = new Image()
    image.onload = () => {
      const viewport = 240
      const baseScale = Math.max(viewport / image.naturalWidth, viewport / image.naturalHeight)
      const drawWidth = image.naturalWidth * baseScale * zoom
      const drawHeight = image.naturalHeight * baseScale * zoom
      const canvas = document.createElement('canvas')
      const outputSize = 512
      canvas.width = outputSize
      canvas.height = outputSize
      const context = canvas.getContext('2d')
      // 編集画面（240px）の位置・拡大率を保存用画像（512px）に合わせる
      context.scale(outputSize / viewport, outputSize / viewport)
      context.beginPath()
      // プレビューと同様、枠線に触れないよう円の端を少し内側にする
      context.arc(viewport / 2, viewport / 2, viewport / 2 - 4, 0, Math.PI * 2)
      context.clip()
      context.drawImage(image, (viewport - drawWidth) / 2 + offset.x, (viewport - drawHeight) / 2 + offset.y, drawWidth, drawHeight)
      canvas.toBlob((blob) => {
        if (!blob) {
          setPhotoError('画像を加工できませんでした。別の画像を選択してください')
          return
        }
        const cropped = new File([blob], `${cropFile?.name.replace(/\.[^.]+$/, '') || 'avatar'}.png`, { type: 'image/png' })
        // 切り抜いた写真を保持し、右端の写真アイコンを選択状態にする
        setPreviewUrl(canvas.toDataURL('image/png'))
        onChange({ avatar: cropped, avatarUrl: value.avatarUrl || null, useAvatar: true, removeAvatar: false })
        cancelCrop()
      }, 'image/png')
    }
    image.onerror = () => setPhotoError('画像を読み込めませんでした。別の画像を選択してください')
    image.src = cropUrl
  }

  function beginDrag(event) {
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragStart({ pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, x: offset.x, y: offset.y })
  }

  function moveDrag(event) {
    if (!dragStart || dragStart.pointerId !== event.pointerId) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const image = event.currentTarget.querySelector('img')
    if (!image) return
    const baseScale = Math.max(240 / image.naturalWidth, 240 / image.naturalHeight)
    const maxX = Math.max(0, (image.naturalWidth * baseScale * zoom - 240) / 2)
    const maxY = Math.max(0, (image.naturalHeight * baseScale * zoom - 240) / 2)
    const nextX = dragStart.x + (event.clientX - dragStart.clientX) * 240 / bounds.width
    const nextY = dragStart.y + (event.clientY - dragStart.clientY) * 240 / bounds.height
    setOffset({ x: Math.max(-maxX, Math.min(maxX, nextX)), y: Math.max(-maxY, Math.min(maxY, nextY)) })
  }

  function chooseIcon(icon) {
    onChange({
      icon,
      useAvatar: false,
      removeAvatar: Boolean(value.avatarUrl),
    })
    setPhotoError('')
  }

  function choosePhoto() {
    onChange({ useAvatar: true, removeAvatar: false })
    setPhotoError('')
  }

  return (
    <div className={styles.photoPicker}>
      <div className={styles.iconChoices} role="group" aria-label="アイコンを選択">
        {PRESET_ICONS.map((icon) => (
          <button
            key={icon.key}
            type="button"
            className={`${styles.iconChoice} ${value.icon === icon.key && !value.useAvatar ? styles.iconChoiceSelected : ''}`}
            aria-label={icon.label}
            aria-pressed={value.icon === icon.key && !value.useAvatar}
            onClick={() => chooseIcon(icon.key)}
          >
            <UserIcon icon={icon.key} size="100%" />
          </button>
        ))}
        <div className={`${styles.photoChoice} ${value.useAvatar ? styles.iconChoiceSelected : ''}`}>
          <input ref={photoInputRef} className={styles.photoInput} type="file" accept="image/*" onChange={selectPhoto} />
          {previewUrl ? (
            <>
              <button type="button" className={styles.photoChoiceImage} aria-label="選択した写真をアイコンにする" aria-pressed={Boolean(value.useAvatar)} onClick={choosePhoto}>
                <UserIcon icon={value.icon} avatarUrl={previewUrl} size="100%" />
              </button>
              <button className={styles.addPhotoButton} type="button" aria-label="写真を変更" onClick={() => photoInputRef.current?.click()}>
                ＋
              </button>
            </>
          ) : (
            <button className={styles.emptyPhotoCircle} type="button" aria-label="写真を選択" onClick={() => photoInputRef.current?.click()}>
              ＋
            </button>
          )}
        </div>
      </div>
      <span className={styles.photoHint}>{previewUrl ? '右端の写真を選ぶか、＋から写真を変更（10MB以下）' : '右端の＋から写真を選択（10MB以下）'}</span>
      {photoError && <span className={styles.photoError} role="alert">{photoError}</span>}
      {cropUrl && (
        <div className={styles.cropBackdrop} role="presentation">
          <section className={styles.cropDialog} role="dialog" aria-modal="true" aria-labelledby="avatar-crop-title">
            <h3 id="avatar-crop-title" className={styles.cropTitle}>アイコンを調整</h3>
            <div
              className={styles.cropViewport}
              onPointerDown={beginDrag}
              onPointerMove={moveDrag}
              onPointerUp={() => setDragStart(null)}
              onPointerCancel={() => setDragStart(null)}
            >
              <div className={styles.cropImageClip}>
                <img
                  src={cropUrl}
                  alt="切り抜き位置の調整"
                  draggable="false"
                  onLoad={(event) => {
                    const image = event.currentTarget
                    const baseScale = Math.max(240 / image.naturalWidth, 240 / image.naturalHeight)
                    image.style.width = `${image.naturalWidth * baseScale}px`
                    image.style.height = `${image.naturalHeight * baseScale}px`
                  }}
                  style={{ transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}
                />
              </div>
              <span className={styles.cropBorder} aria-hidden="true" />
            </div>
            <label className={styles.zoomControl}>
              <span>拡大・縮小</span>
              <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
            </label>
            <p className={styles.cropHint}>写真をドラッグして位置を調整できます</p>
            {photoError && <p className={styles.photoError} role="alert">{photoError}</p>}
            <div className={styles.cropActions}>
              <button type="button" className={styles.cropCancel} onClick={cancelCrop}>キャンセル</button>
              <button type="button" className={styles.cropConfirm} onClick={confirmCrop}>決定</button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

