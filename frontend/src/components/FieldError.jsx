import form from '../styles/form.module.css'
export default function FieldError({ errors, name }) {
  const messages = errors?.[name]
  if (!messages) return null
  return <span id={name + '-error'} className={form.fieldError} role="alert">{[].concat(messages).join('。')}</span>
}
