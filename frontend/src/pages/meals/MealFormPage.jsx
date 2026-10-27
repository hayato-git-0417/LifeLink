// 食事を記録（デザイン p.14）／修正（/meals/:id/edit）。写真・内容・区分・時間・栄養値・コメント。
// 写真はスマホのカメラ／ファイル選択（capture="environment"）。送信は multipart（meal[photo]）。
// 写真を選ぶと自動で圧縮（JPEG・長辺1000px以下・1MB未満）し、解析API（/meals/scan）で内容・栄養値を自動入力する。
// 解析結果は手で修正できるよう、内容・栄養値は入力欄のまま残す。
// スマホ（375×667）でスクロールを減らすため、写真は小さな枠で内容・時間の横に置き、栄養は2列、コメントは折りたたむ
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../../api/client.js'
import AppShell from '../../components/AppShell.jsx'
import ErrorList from '../../components/ErrorList.jsx'
import { CameraIcon } from '../../components/icons.jsx'
import { fromDateTimeLocal, toDateTimeLocal } from '../../lib/format.js'
import form from '../../styles/form.module.css'
import styles from './Meals.module.css'
import { guessMealType, MEAL_TYPES, NUTRIENTS } from './mealTypes.js'

// 解析APIへ送る画像の条件
const PHOTO_TARGET_BYTES = 1024 * 1024 // 1MB未満
const PHOTO_MAX_SIDE = 1000
const PHOTO_INPUT_MAX_MB = 30 // 圧縮前の画像の上限

// 画像をJPEGへ変換し、長辺1000px以下・1MB未満に圧縮する
async function compressPhoto(file) {
  if (!file.type.startsWith('image/')) {
    throw new Error('画像ファイルを選択してください')
  }

  if (file.size > PHOTO_INPUT_MAX_MB * 1024 * 1024) {
    throw new Error(
      `撮影した写真が大きすぎます。${PHOTO_INPUT_MAX_MB}MB以下の画像を選択してください`
    )
  }

  let bitmap
  let imageUrl

  try {
    if ('createImageBitmap' in window) {
      bitmap = await createImageBitmap(file)
    } else {
      // createImageBitmapに対応していないブラウザ用
      bitmap = await new Promise((resolve, reject) => {
        const image = new Image()
        imageUrl = URL.createObjectURL(file)

        image.onload = () => resolve(image)
        image.onerror = () => {
          reject(
            new Error(
              '写真を読み込めませんでした。JPEGまたはPNG画像を選択してください'
            )
          )
        }

        image.src = imageUrl
      })
    }

    const originalWidth = bitmap.width
    const originalHeight = bitmap.height

    if (!originalWidth || !originalHeight) {
      throw new Error('写真のサイズを読み取れませんでした')
    }

    // 縦横比を維持して長辺を1000px以下にする
    let scale = Math.min(
      1,
      PHOTO_MAX_SIDE / Math.max(originalWidth, originalHeight)
    )

    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error('画像の圧縮に対応していないブラウザです')
    }

    // 画質を調整しても1MB未満にならなければ、画像自体も縮小する
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const width = Math.max(1, Math.round(originalWidth * scale))
      const height = Math.max(1, Math.round(originalHeight * scale))

      canvas.width = width
      canvas.height = height

      context.clearRect(0, 0, width, height)
      context.drawImage(bitmap, 0, 0, width, height)

      for (const quality of [0.85, 0.75, 0.65, 0.55, 0.45, 0.35]) {
        const blob = await new Promise((resolve) => {
          canvas.toBlob(resolve, 'image/jpeg', quality)
        })

        if (blob && blob.size < PHOTO_TARGET_BYTES) {
          const baseName =
            file.name.replace(/\.[^.]+$/, '') || 'meal-photo'

          return new File([blob], `${baseName}.jpg`, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          })
        }
      }

      // 画質を下げても大きい場合は、縦横の解像度をさらに80%にする
      scale *= 0.8
    }

    throw new Error(
      '写真を1MB未満に圧縮できませんでした。別の写真をお試しください'
    )
  } catch (error) {
    if (error instanceof Error && error.message) {
      throw error
    }

    throw new Error(
      '写真の読み込み・圧縮に失敗しました。JPEGまたはPNG画像をお試しください'
    )
  } finally {
    bitmap?.close?.()

    if (imageUrl) {
      URL.revokeObjectURL(imageUrl)
    }
  }
}

function emptyMeal() {
  return {
    meal_type: 'snack',
    eaten_at: toDateTimeLocal(),
    content: '',
    comment: '',
    ...Object.fromEntries(
      NUTRIENTS.map(({ key }) => [key, ''])
    ),
  }
}

export default function MealFormPage() {
  const { id } = useParams()
  const editing = Boolean(id)
  const navigate = useNavigate()
  const fileInput = useRef(null)

  const [meal, setMeal] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState(null)
  const [removePhoto, setRemovePhoto] = useState(false)
  const [errors, setErrors] = useState([])
  const [busy, setBusy] = useState(false)
  const [scanning, setScanning] = useState(false)

  // 解析中・送信中は入力を止める
  const locked = busy || scanning

  // 編集画面では保存済みの内容を読み込む
  // 新規画面では目標に合わせて食事区分を初期設定する
  useEffect(() => {
    let cancelled = false

    if (editing) {
      api(`/meals/${id}`)
        .then(({ meal: data }) => {
          if (cancelled) return

          setMeal({
            meal_type: data.meal_type,
            eaten_at: toDateTimeLocal(new Date(data.eaten_at)),
            content: data.content ?? '',
            comment: data.comment ?? '',
            ...Object.fromEntries(
              NUTRIENTS.map(({ key }) => [
                key,
                data[key] == null ? '' : String(data[key]),
              ])
            ),
          })

          setCurrentPhotoUrl(data.photo_url ?? null)
        })
        .catch((error) => {
          if (!cancelled) {
            setErrors(
              error.messages || ['食事記録の取得に失敗しました']
            )
          }
        })
    } else {
      api('/goal')
        .then(({ goal }) => {
          if (cancelled) return

          setMeal({
            ...emptyMeal(),
            meal_type: guessMealType(goal),
          })
        })
        .catch(() => {
          if (!cancelled) setMeal(emptyMeal())
        })
    }

    return () => {
      cancelled = true
    }
  }, [editing, id])

  // プレビュー用の一時URLを解放する
  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview)
      }
    }
  }, [photoPreview])

  const update = (changes) => {
    setMeal((current) =>
      current ? { ...current, ...changes } : current
    )
  }

  // 写真を選択・撮影したら、自動圧縮してから解析する
  async function choosePhoto(event) {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    setErrors([])
    setScanning(true)

    // 以前の写真を解析に失敗した新しい写真と混同しないようにする
    setPhotoFile(null)
    setPhotoPreview(null)

    try {
      // JPEG・長辺1000px以下・1MB未満に変換する
      const compressedFile = await compressPhoto(selectedFile)
      const previewUrl = URL.createObjectURL(compressedFile)

      setPhotoFile(compressedFile)
      setPhotoPreview(previewUrl)
      setRemovePhoto(false)

      // 圧縮済みの写真を解析APIへ送信する
      const scanBody = new FormData()
      scanBody.append('meal[photo]', compressedFile)

      const response = await api('/meals/scan', {
        method: 'POST',
        body: scanBody,
      })

      const scan = response?.scan

      if (!scan) {
        throw new Error('写真の解析結果を取得できませんでした')
      }

      setMeal((current) => {
        if (!current) return current

        // 解析で取得できた項目だけを更新する
        const updated = {
          ...current,
          content: scan.content ?? current.content,
        }

        NUTRIENTS.forEach(({ key }) => {
          if (scan[key] != null) {
            updated[key] = String(scan[key])
          }
        })

        return updated
      })
    } catch (error) {
      setErrors(
        error.messages ||
          [error.message || '写真の解析に失敗しました']
      )

      // 解析できなかった写真を保存用として送信しない
      setPhotoFile(null)
      setPhotoPreview(null)

      if (fileInput.current) {
        fileInput.current.value = ''
      }
    } finally {
      setScanning(false)
    }
  }

  // 写真を外す
  function clearPhoto() {
    setPhotoFile(null)
    setPhotoPreview(null)

    if (fileInput.current) {
      fileInput.current.value = ''
    }

    if (currentPhotoUrl) {
      setRemovePhoto(true)
    }
  }

  // 入力内容を保存する
  async function handleSubmit(event) {
    event.preventDefault()

    if (locked) return

    // 食事写真を必須にする
    if (!photoFile && (removePhoto || !currentPhotoUrl)) {
      setErrors([
        '食事の写真を撮影するか、画像を選択してください',
      ])
      window.scrollTo(0, 0)
      return
    }

    if (!meal) {
      setErrors(['食事情報を読み込めていません'])
      return
    }

    if (!meal.eaten_at) {
      setErrors(['時間を入力してください'])
      window.scrollTo(0, 0)
      return
    }

    setBusy(true)
    setErrors([])

    try {
      const body = new FormData()

      body.append('meal[meal_type]', meal.meal_type)
      body.append('meal[eaten_at]', fromDateTimeLocal(meal.eaten_at))
      body.append('meal[content]', (meal.content ?? '').trim())
      body.append('meal[comment]', (meal.comment ?? '').trim())

      NUTRIENTS.forEach(({ key }) => {
        body.append(`meal[${key}]`, meal[key] ?? '')
      })

      // 保存する写真も、解析時に圧縮したJPEGを使う
      if (photoFile) {
        body.append('meal[photo]', photoFile)
      }

      if (removePhoto && !photoFile) {
        body.append('meal[remove_photo]', 'true')
      }

      await api(editing ? `/meals/${id}` : '/meals', {
        method: editing ? 'PATCH' : 'POST',
        body,
      })

      navigate('/meals')
    } catch (error) {
      setErrors(
        error.messages ||
          [error.message || '食事記録の保存に失敗しました']
      )
      setBusy(false)
      window.scrollTo(0, 0)
    }
  }

  // 食事記録を削除する
  async function handleDelete() {
    if (locked) return

    if (!window.confirm('この食事の記録を削除しますか？')) {
      return
    }

    setBusy(true)
    setErrors([])

    try {
      await api(`/meals/${id}`, { method: 'DELETE' })
      navigate('/meals')
    } catch (error) {
      setErrors(
        error.messages || ['食事記録の削除に失敗しました']
      )
      setBusy(false)
    }
  }

  // 新しい写真を優先して表示する
  const shownPhoto =
    photoPreview || (!removePhoto && currentPhotoUrl)

  // 送信ボタンの文言
  const submitLabel = scanning
    ? '解析中…'
    : busy
      ? '送信中…'
      : editing
        ? '保存する'
        : '記録する'

  return (
    <AppShell title={editing ? '食事を修正' : '食事を記録'} backTo="/meals">
      <ErrorList errors={errors} />

      {!meal ? (
        !errors.length && <p className={form.loading}>読み込み中…</p>
      ) : (
        <form className={form.form} onSubmit={handleSubmit} noValidate>
          <section className={`${form.card} ${styles.mealForm}`}>
            <div className={styles.formTop}>
              <div className={styles.photoCol}>
                <label className={`${styles.photoBox} ${shownPhoto ? styles.photoBoxFilled : ''}`}>
                  {shownPhoto ? (
                    <img src={shownPhoto} alt="食事の写真" className={styles.photo} />
                  ) : (
                    <span className={styles.photoEmpty}>
                      <CameraIcon size={28} />
                      {scanning ? '解析中…' : '写真を撮る'}
                    </span>
                  )}
                  <input
                    ref={fileInput}
                    className={styles.fileInput}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={choosePhoto}
                    disabled={locked}
                  />
                </label>
                {shownPhoto && (
                  <button
                    type="button"
                    className={`${form.linkButton} ${styles.smallLink}`}
                    onClick={clearPhoto}
                    disabled={locked}
                  >
                    写真を外す
                  </button>
                )}
              </div>

              <div className={styles.topFields}>
                <label className={styles.field}>
                  <span className={styles.smallLabel}>内容</span>
                  <input
                    className={`${form.input} ${styles.compactInput}`}
                    type="text"
                    maxLength={255}
                    placeholder={scanning ? '写真を解析中…' : '例: ご飯、焼き魚'}
                    value={meal.content ?? ''}
                    disabled={locked}
                    onChange={(event) => update({ content: event.target.value })}
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles.smallLabel}>時間</span>
                  <input
                    className={`${form.input} ${styles.compactInput}`}
                    type="datetime-local"
                    value={meal.eaten_at}
                    disabled={locked}
                    onChange={(event) => update({ eaten_at: event.target.value })}
                  />
                </label>
              </div>
            </div>

            <fieldset className={styles.typeRow} disabled={locked}>
              <legend className={styles.smallLabel}>区分</legend>
              <div className={styles.mealTypes}>
                {MEAL_TYPES.map(({ key, label }) => (
                  <label key={key} className={`${styles.chip} ${meal.meal_type === key ? styles.chipOn : ''}`}>
                    <input
                      type="radio"
                      name="meal_type"
                      value={key}
                      checked={meal.meal_type === key}
                      onChange={() => update({ meal_type: key })}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className={styles.nutrientSet} disabled={locked}>
              <legend className={styles.smallLabel}>
                {scanning ? '栄養（写真を解析中…）' : '栄養（写真から自動入力・修正できます）'}
              </legend>
              <div className={styles.nutrientInputs}>
                {NUTRIENTS.map(({ key, label, unit, step }) => (
                  <label key={key} className={styles.nutrientField}>
                    <span className={styles.nutrientFieldLabel}>{label}</span>
                    <span className={styles.withUnit}>
                      <input
                        className={`${form.input} ${styles.number}`}
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step={step}
                        value={meal[key] ?? ''}
                        onChange={(event) => update({ [key]: event.target.value })}
                      />
                      <span className={styles.unit}>{unit}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <details className={styles.commentBox} open={Boolean(meal.comment)}>
              <summary className={styles.smallLabel}>コメント（任意）</summary>
              <textarea
                className={`${form.input} ${styles.comment}`}
                rows={2}
                aria-label="コメント"
                value={meal.comment ?? ''}
                disabled={locked}
                onChange={(event) => update({ comment: event.target.value })}
              />
            </details>
          </section>

          {editing ? (
            <div className={`${form.actions} ${form.actionsBetween}`}>
              <button type="button" className={`${form.button} ${form.danger}`} onClick={handleDelete} disabled={locked}>
                削除
              </button>
              <button type="submit" className={`${form.button} ${form.primary}`} disabled={locked}>
                {submitLabel}
              </button>
            </div>
          ) : (
            <button type="submit" className={`${form.button} ${form.primary} ${form.block}`} disabled={locked}>
              {submitLabel}
            </button>
          )}
        </form>
      )}
    </AppShell>
  )
}