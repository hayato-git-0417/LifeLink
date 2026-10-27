import AppShell from '../../components/AppShell.jsx'
import form from '../../styles/form.module.css'

export default function SoundSettingsPage({ currentBgm, onSaveBgm }) {
  function handleSave(event) {
    event.preventDefault()

    const select = event.currentTarget.querySelector('#home-bgm')
    const selectedBgm = select.value

    onSaveBgm(selectedBgm)
  }

  return (
    <AppShell title="サウンド" backTo="/settings">
        <form className={form.form} onSubmit={handleSave}>
        <div className={`${form.card} ${form.field}`}>
            <label htmlFor="home-bgm" className={form.label}>
            ホーム画面のBGM
            </label>

            <select id="home-bgm" className={form.input} defaultValue={currentBgm}>
                <option value="hidamari">ひだまりのよりみち</option>
                <option value="breakfast">Breakfast High Score</option>
                <option value="tomato">tomato</option>
                <option value="Morning Grove">Morning Grove</option>
                <option value="スイカと夏休み">スイカと夏休み</option>
            </select>
        </div>

        <button
            type="submit"
            className={`${form.button} ${form.primary} ${form.block}`}
        >
            設定を保存する
        </button>
        </form>
    </AppShell>
    )
}