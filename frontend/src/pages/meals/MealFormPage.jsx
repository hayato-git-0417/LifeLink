// 食事を記録（デザイン p.14）／修正（/meals/:id/edit）。写真・内容・区分・時間・栄養値・コメント。
// 写真はスマホのカメラ／ファイル選択（capture="environment"）。送信は multipart（meal[photo]）。
// 写真を選ぶと自動で圧縮（JPEG・長辺1536px以下・2MB未満）し、解析API（/meals/scan）で料理名・栄養値を取得する。
// 料理名は自動入力し、内容・栄養値は入力欄で修正できるようにする。
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
import { portionNutritionTotals } from './portionNutrition.js'

// 解析APIへ送る画像の条件
const PHOTO_TARGET_BYTES = 2 * 1024 * 1024 // 2MB未満
const PHOTO_MAX_SIDE = 1536

// 元画像のサイズにかかわらず、JPEG・長辺1536px以下・2MB未満に圧縮する
async function compressPhoto(file) {
  if (!file.type.startsWith('image/')) {
    throw new Error('画像ファイルを選択してください')
  }

  let bitmap
  let imageUrl

  try {
    if ('createImageBitmap' in window) {
      try {
        bitmap = await createImageBitmap(file)
      } catch {
        bitmap = null
      }
    }

    if (!bitmap) {
      // ImageBitmap に対応していない・デコードできないブラウザ用
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

    // 縦横比を維持して長辺を1536px以下にする
    let scale = Math.min(
      1,
      PHOTO_MAX_SIDE / Math.max(originalWidth, originalHeight)
    )

    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error('画像の圧縮に対応していないブラウザです')
    }

    // 画質を調整しても2MB未満にならなければ、画像自体も縮小する
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const width = Math.max(1, Math.round(originalWidth * scale))
      const height = Math.max(1, Math.round(originalHeight * scale))

      canvas.width = width
      canvas.height = height

      context.clearRect(0, 0, width, height)
      context.drawImage(bitmap, 0, 0, width, height)

      for (const quality of [0.92, 0.85, 0.78, 0.7, 0.6]) {
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
      '写真を2MB未満に圧縮できませんでした。別の写真をお試しください'
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

function foodItemNutrients(items) {
  return Object.fromEntries(
    NUTRIENTS.map(({ key }) => {
      const total = items.reduce(
        (sum, item) =>
          sum + (Number(item[key]) || 0) * (Number(item.weight_g) || 0) / 100,
        0,
      )
      return [key, key === 'calories' ? String(Math.round(total)) : (Math.round(total * 10) / 10).toFixed(1)]
    }),
  )
}

export default function MealFormPage() {
  const { id } = useParams()
  const editing = Boolean(id)
  const navigate = useNavigate()
  const fileInput = useRef(null)

  const [meal, setMeal] = useState(null)
  const [mealGoal, setMealGoal] = useState(null)
  const [scanPortions, setScanPortions] = useState([])
  const [nutritionInfo, setNutritionInfo] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState(null)
  const [removePhoto, setRemovePhoto] = useState(false)
  const [errors, setErrors] = useState([])
  const [busy, setBusy] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [foodQuery, setFoodQuery] = useState('')
  const [foodResults, setFoodResults] = useState([])
  const [foodItems, setFoodItems] = useState([])
  const [mealTypeManuallySelected, setMealTypeManuallySelected] = useState(false)

  // 解析中・送信中は入力を止める
  const locked = busy || scanning
  const mealType = meal?.meal_type || 'snack'
  const mealContent = meal?.content || ''
  // 編集画面では保存済みの内容を読み込む
  // 新規画面では目標に合わせて食事区分を初期設定する
  useEffect(() => {
    let cancelled = false

    if (editing) {
      api('/goal').then(({ goal }) => { if (!cancelled) setMealGoal(goal) }).catch(() => {})
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
          setMealTypeManuallySelected(Boolean(data.manual_meal_type))
          setFoodItems(
            (data.food_items ?? []).map((item) => ({
              ...item,
              weight_g: String(item.weight_g),
            })),
          )

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
          setMealGoal(goal)

          setMeal({
            ...emptyMeal(),
            meal_type: guessMealType(goal),
          })
          setMealTypeManuallySelected(false)
        })
        .catch(() => {
          if (!cancelled) setMeal(emptyMeal())
        })
    }

    return () => {
      cancelled = true
    }
  }, [editing, id])

  useEffect(() => {
    const query = foodQuery.trim()
    if (!query) {
      return undefined
    }

    let cancelled = false
    const timer = window.setTimeout(() => {
      api('/food_compositions', { params: { q: query } })
        .then(({ foods }) => {
          if (!cancelled) setFoodResults(foods)
        })
        .catch((error) => {
          if (!cancelled) setErrors(error.messages || ['食品の検索に失敗しました'])
        })
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [foodQuery])

  // プレビュー用の一時URLを解放する
  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview)
      }
    }
  }, [photoPreview])

  const update = (changes) => {
    const nextChanges = { ...changes }
    if ('eaten_at' in nextChanges && !mealTypeManuallySelected) {
      nextChanges.meal_type = guessMealType(mealGoal, new Date(nextChanges.eaten_at))
    }
    if ('content' in nextChanges || NUTRIENTS.some(({ key }) => key in nextChanges)) setNutritionInfo(null)
    setMeal((current) =>
      current ? { ...current, ...nextChanges } : current
    )
  }

  function selectMealType(meal_type) {
    if (locked) return
    setMealTypeManuallySelected(true)
    update({ meal_type })
  }

  function replaceFoodItems(items) {
    setFoodItems(items)
    if (items.length) {
      update(foodItemNutrients(items))
    } else {
      update(Object.fromEntries(NUTRIENTS.map(({ key }) => [key, ''])))
    }
  }

  function addFoodItem(food) {
    replaceFoodItems([
      ...foodItems,
      {
        food_composition_id: food.id,
        name: food.name,
        weight_g: '100',
        ...Object.fromEntries(NUTRIENTS.map(({ key }) => [key, food[key]])),
      },
    ])
    setFoodQuery('')
    setFoodResults([])
  }

  function updateFoodWeight(index, weight_g) {
    replaceFoodItems(foodItems.map((item, itemIndex) =>
      itemIndex === index ? { ...item, weight_g } : item,
    ))
  }

  function removeFoodItem(index) {
    replaceFoodItems(foodItems.filter((_, itemIndex) => itemIndex !== index))
  }

  function applyPortionWeights() {
    if (locked || foodItems.length) return
    const totals = portionNutritionTotals(scanPortions)
    if (!Object.values(totals).some((value) => value != null && value !== '')) return
    setMeal((current) => ({ ...current, ...totals }))
    setNutritionInfo({ content: mealContent, basis: '品目ごとの栄養値 × 手動調整した重量', warning: Object.values(totals).some((value) => value === '') ? '一部の栄養値は推定できないため空欄です。' : null })
  }

  async function scanPhoto(photo, contentHint = '') {
    const scanBody = new FormData()
    scanBody.append('meal[photo]', photo)
    if (contentHint.trim()) scanBody.append('meal[content]', contentHint.trim())

    const response = await api('/meals/scan', { method: 'POST', body: scanBody })
    const scan = response?.scan
    if (!scan) throw new Error('写真の解析結果を取得できませんでした')
    setScanPortions((scan.portion_estimates || []).map((portion) => ({ ...portion, weight_g: portion.weight_g == null ? '' : String(portion.weight_g) })))
    setNutritionInfo({
      content: scan.content || mealContent,
      basis: scan.nutrition_basis || '写真からの推定',
      warning: [scan.nutrition_warning, scan.warning].filter(Boolean).join(' '),
    })

    setMeal((current) => {
      if (!current) return current
      const updated = { ...current, content: scan.content ?? current.content }
      if (!foodItems.length) {
        NUTRIENTS.forEach(({ key }) => {
          updated[key] = scan[key] == null ? '' : String(scan[key])
        })
      }
      return updated
    })
  }

  // 入力中の内容をヒントに、選択中または保存済みの写真を再解析する
  async function rescanPhoto() {
    if (locked || (!photoFile && (removePhoto || !currentPhotoUrl))) return
    setErrors([])
    setScanning(true)
    try {
      let photo = photoFile
      if (!photo) {
        const response = await fetch(currentPhotoUrl)
        if (!response.ok) throw new Error('保存済みの写真を読み込めませんでした')
        const blob = await response.blob()
        photo = await compressPhoto(new File([blob], 'meal-photo', { type: blob.type }))
      }
      await scanPhoto(photo, meal?.content ?? '')
    } catch (error) {
      setErrors(error.messages || [error.message || '写真の再解析に失敗しました'])
    } finally {
      setScanning(false)
    }
  }

  // 写真を選択・撮影したら、自動圧縮してから解析する
  async function choosePhoto(event) {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    setNutritionInfo(null)
    setErrors([])
    setScanning(true)

    // 以前の写真を解析に失敗した新しい写真と混同しないようにする
    setPhotoFile(null)
    setPhotoPreview(null)

    try {
      // JPEG・長辺1536px以下・2MB未満に変換する
      const compressedFile = await compressPhoto(selectedFile)
      const previewUrl = URL.createObjectURL(compressedFile)

      setPhotoFile(compressedFile)
      setPhotoPreview(previewUrl)
      setRemovePhoto(false)

      await scanPhoto(compressedFile, meal?.content ?? '')
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

      body.append('meal[meal_type]', mealType)
      body.append('meal[manual_meal_type]', String(mealTypeManuallySelected))
      body.append('meal[eaten_at]', fromDateTimeLocal(meal.eaten_at))
      body.append('meal[content]', (meal.content ?? '').trim())
      body.append('meal[comment]', (meal.comment ?? '').trim())

      NUTRIENTS.forEach(({ key }) => {
        body.append(`meal[${key}]`, meal[key] ?? '')
      })
      body.append(
        'meal[food_items_json]',
        JSON.stringify(foodItems.map(({ food_composition_id, weight_g }) => ({
          food_composition_id,
          weight_g,
        }))),
      )

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
                    onClick={rescanPhoto}
                    disabled={locked}
                  >
                    {scanning ? '解析中…' : '再解析する'}
                  </button>
                )}
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
                  {shownPhoto && (
                    <span className={styles.rescanHint}>
                      内容の編集だけでは栄養値は変わりません。「再解析する」で再推定します。
                      {foodItems.length
                        ? '食品と量から計算した栄養値は保持します。'
                        : '内容と栄養値を更新します。'}
                    </span>
                  )}
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

            <fieldset className={styles.typeRow} title="食べた時刻から自動設定します。解析後はタップして区分を変更できます。朝・昼・夕は各1日1件、設定時刻の前後1時間以外は間食になります。">
              <legend className={styles.smallLabel}>区分</legend>
              <div className={styles.mealTypes} role="radiogroup" aria-label="食事区分">
                {MEAL_TYPES.map(({ key, label }) => (
                  <label key={key} className={styles.chip + ' ' + (mealType === key ? styles.chipOn : '')}>
                    <input
                      type="radio"
                      name="meal_type"
                      value={key}
                      checked={mealType === key}
                      disabled={locked}
                      onChange={() => selectMealType(key)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className={styles.foodPicker}>
              <label className={styles.field}>
                <span className={styles.smallLabel}>食品成分表から食品を追加（100gあたり）</span>
                <input
                  className={`${form.input} ${styles.compactInput}`}
                  type="search"
                  placeholder="例: ごはん、さけ"
                  value={foodQuery}
                  disabled={locked}
                  onChange={(event) => {
                    setFoodQuery(event.target.value)
                    setFoodResults([])
                  }}
                />
              </label>
              {foodResults.length > 0 && (
                <ul className={styles.foodResults}>
                  {foodResults.map((food) => (
                    <li key={food.id}>
                      <button
                        type="button"
                        className={styles.foodResult}
                        disabled={locked}
                        onClick={() => addFoodItem(food)}
                      >
                        {food.name}（{food.calories ?? '—'} kcal/100g）
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {foodItems.length > 0 && (
                <ul className={styles.foodItems}>
                  {foodItems.map((item, index) => (
                    <li key={`${item.food_composition_id}-${index}`} className={styles.foodItem}>
                      <span>{item.name}</span>
                      <label>
                        量
                        <input
                          className={`${form.input} ${styles.foodWeight}`}
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={item.weight_g}
                          disabled={locked}
                          onChange={(event) => updateFoodWeight(index, event.target.value)}
                        />
                        g
                      </label>
                      <button
                        type="button"
                        className={form.linkButton}
                        disabled={locked}
                        onClick={() => removeFoodItem(index)}
                      >
                        削除
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className={styles.foodNote}>
                食品と量から栄養を自動計算します。成分表に値がない項目は合計に含まれません。
              </p>
            </div>

            <fieldset className={styles.nutrientSet} disabled={locked}>
              <legend className={styles.smallLabel}>
                {scanning
                  ? '栄養（写真を解析中…）'
                  : foodItems.length
                    ? '栄養（食品と量から自動計算）'
                    : '栄養（写真から自動入力・修正できます）'}
              </legend>
              {!foodItems.length && nutritionInfo?.content === mealContent && (
                <p className={styles.foodNote} role="status">
                  {nutritionInfo.basis}。料理の種類と量には推定が含まれます。
                  {nutritionInfo.warning && <><br />{nutritionInfo.warning}</>}
                </p>
              )}
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
                        disabled={foodItems.length > 0}
                        onChange={(event) => update({ [key]: event.target.value })}
                      />
                      <span className={styles.unit}>{unit}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            {!foodItems.length && scanPortions.length > 0 && nutritionInfo?.content === mealContent && (
              <details className={styles.commentBox}>
                <summary>推定した品目と量を確認・修正</summary>
                <p className={styles.foodNote}>写真から推定した調理後の重量です。量が分かる場合は修正して再計算できます。</p>
                <div className={styles.portionList}>
                  {scanPortions.map((portion, index) => (
                    <label key={index} className={styles.portionRow} title={portion.reference_name || '食品成分表の候補に一致しないためAIで推定'}>
                      <span>{portion.name}<small>{portion.source === 'food_composition' ? '食品成分表' : 'AI推定'}</small></span>
                      <input className={form.input + ' ' + styles.foodWeight} type="number" inputMode="decimal" min="0.1" max="10000" step="0.1" aria-label={portion.name + 'の重量'} value={portion.weight_g} disabled={locked} onChange={(event) => setScanPortions((current) => current.map((item, i) => i === index ? { ...item, weight_g: event.target.value } : item))} />
                      <span>g</span>
                    </label>
                  ))}
                </div>
                <button type="button" className={form.button} disabled={locked || !Object.values(portionNutritionTotals(scanPortions)).some((value) => value != null && value !== '')} onClick={applyPortionWeights}>この量で栄養値を再計算</button>
              </details>
            )}

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
