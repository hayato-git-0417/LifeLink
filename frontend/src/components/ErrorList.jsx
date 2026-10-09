// API・入力チェックのエラー（文字列の配列）を並べて出す
import styles from '../styles/form.module.css'

export default function ErrorList({ errors }) {
  if (!errors?.length) return null
  return (
    <ul className={styles.errors} role="alert">
      {errors.map((message) => (
        <li key={message}>{message}</li>
      ))}
    </ul>
  )
}
