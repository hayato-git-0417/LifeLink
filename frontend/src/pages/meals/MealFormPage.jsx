// 食事を記録（デザイン p.14）／修正（/meals/:id/edit）。写真・内容・区分・時間・栄養値・コメント。
// 写真はスマホのカメラ／ファイル選択（capture="environment"）。送信は multipart（meal[photo]）。
// 今回は手入力だけ（spec.md 6章）。デザインの内容の候補ボタンはスキャン用なので、自由入力の1行にする
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../../api/client.js'
import AppShell from '../../components/AppShell.jsx'
import ErrorList from '../../components/ErrorList.jsx'
import { fromDateTimeLocal, toDateTimeLocal } from '../../lib/format.js'
import form from '../../styles/form.module.css'
import styles from './Meals.module.css'
import { guessMealType, MEAL_TYPES, NUTRIENTS } from './mealTypes.js'

const PHOTO_MAX_MB = 10

function emptyMeal() {
  return {
    meal_type: 'snack',
    eaten_at: toDateTimeLocal(),
    content: '',
    comment: '',
    ...Object.fromEntries(NUTRIENTS.map(({ key }) => [key, ''])),
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

  useEffect(() => {
    if (editing) {
      api(`/meals/${id}`)
        .then(({ meal: data }) => {
          setMeal({
            meal_type: data.meal_type,
            eaten_at: toDateTimeLocal(new Date(data.eaten_at)),
            content: data.content ?? '',
            comment: data.comment ?? '',
            ...Object.fromEntries(NUTRIENTS.map(({ key }) => [key, data[key] == null ? '' : String(data[key])])),
          })
          setCurrentPhotoUrl(data.photo_url)
        })
        .catch((error) => setErrors(error.messages))
    } else {
      // 区分の初期値は目標の食事時刻から決める
      api('/goal')
        .then(({ goal }) => setMeal({ ...emptyMeal(), meal_type: guessMealType(goal) }))
        .catch(() => setMeal(emptyMeal()))
    }
  }, [editing, id])

  // プレビュー用の URL は使い終わったら解放する
  useEffect(() => () => photoPreview && URL.revokeObjectURL(photoPreview), [photoPreview])

  const update = (changes) => setMeal((current) => ({ ...current, ...changes }))

  function choosePhoto(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return setErrors(['写真は画像ファイルを選んでください'])
    if (file.size > PHOTO_MAX_MB * 1024 * 1024) return setErrors([`写真は${PHOTO_MAX_MB}MB以下にしてください`])
    setErrors([])
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    setRemovePhoto(false)
  }

  function clearPhoto() {
    setPhotoFile(null)
    setPhotoPreview(null)
    if (fileInput.current) fileInput.current.value = ''
    if (currentPhotoUrl) setRemovePhoto(true)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!meal.eaten_at) return setErrors(['時間を入力してください'])

    const body = new FormData()
    body.append('meal[meal_type]', meal.meal_type)
    body.append('meal[eaten_at]', fromDateTimeLocal(meal.eaten_at))
    body.append('meal[content]', meal.content.trim())
    body.append('meal[comment]', meal.comment.trim())
    NUTRIENTS.forEach(({ key }) => body.append(`meal[${key}]`, meal[key]))
    if (photoFile) body.append('meal[photo]', photoFile)
    if (removePhoto && !photoFile) body.append('meal[remove_photo]', 'true')

    setBusy(true)
    setErrors([])
    try {
      await api(editing ? `/meals/${id}` : '/meals', { method: editing ? 'PATCH' : 'POST', body })
      navigate('/meals')
    } catch (error) {
      setErrors(error.messages)
      setBusy(false)
      window.scrollTo(0, 0)
    }
  }

  async function handleDelete() {
    if (!window.confirm('この食事の記録を削除しますか？')) return
    setBusy(true)
    try {
      await api(`/meals/${id}`, { method: 'DELETE' })
      navigate('/meals')
    } catch (error) {
      setErrors(error.messages)
      setBusy(false)
    }
  }

  const shownPhoto = photoPreview || (!removePhoto && currentPhotoUrl)

  return (
    <AppShell title={editing ? '食事を修正' : '食事を記録'} backTo="/meals">
      <ErrorList errors={errors} />
      {!meal ? (
        !errors.length && <p className={styles.loading}>読み込み中…</p>
      ) : (
        <form className={`${form.form} ${styles.mealForm}`} onSubmit={handleSubmit} noValidate>
          <label className={styles.photoBox}>
            {shownPhoto ? (
              <img src={shownPhoto} alt="食事の写真" className={styles.photo} />
            ) : (
              <span className={styles.photoEmpty}>
                <span className={styles.photoPlus}>＋</span>
                撮影する
              </span>
            )}
            <input
              ref={fileInput}
              className={styles.fileInput}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={choosePhoto}
            />
          </label>
          {shownPhoto && (
            <button type="button" className={form.linkButton} onClick={clearPhoto}>
              写真を外す
            </button>
          )}

          <label className={form.field}>
            <span className={form.label}>内容</span>
            <input
              className={form.input}
              type="text"
              maxLength={255}
              placeholder="例: ご飯、魚の塩焼き、サラダ"
              value={meal.content}
              onChange={(event) => update({ content: event.target.value })}
            />
          </label>

          <fieldset className={form.field}>
            <legend className={form.label}>区分</legend>
            <div className={styles.mealTypes}>
              {MEAL_TYPES.map(({ key, label }) => (
                <label key={key} className={`${styles.chip} ${meal.meal_type === key ? styles.chipOn : ''}`}>
                  <input
                    type="radio"
                    name="meal_type"
                    checked={meal.meal_type === key}
                    onChange={() => update({ meal_type: key })}
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          <label className={form.field}>
            <span className={form.label}>時間</span>
            <input
              className={form.input}
              type="datetime-local"
              value={meal.eaten_at}
              onChange={(event) => update({ eaten_at: event.target.value })}
            />
          </label>

          <fieldset className={form.field}>
            <legend className={form.label}>栄養（分かる範囲で）</legend>
            <div className={styles.nutrientInputs}>
              {NUTRIENTS.map(({ key, label, unit, step }) => (
                <label key={key} className={styles.nutrientRow}>
                  <span>{label}</span>
                  <input
                    className={`${form.input} ${styles.number}`}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step={step}
                    value={meal[key]}
                    onChange={(event) => update({ [key]: event.target.value })}
                  />
                  <span>{unit}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className={form.field}>
            <span className={form.label}>コメント</span>
            <textarea
              className={`${form.input} ${styles.comment}`}
              rows={3}
              value={meal.comment}
              onChange={(event) => update({ comment: event.target.value })}
            />
          </label>

          <div className={`${form.actions} ${editing ? form.actionsBetween : form.actionsCenter}`}>
            {editing && (
              <button type="button" className={`${form.button} ${styles.danger}`} onClick={handleDelete} disabled={busy}>
                削除
              </button>
            )}
            <button type="submit" className={`${form.button} ${form.primary}`} disabled={busy}>
              {busy ? '送信中…' : editing ? '保存する' : '記録する'}
            </button>
          </div>
        </form>
      )}
    </AppShell>
  )
}
