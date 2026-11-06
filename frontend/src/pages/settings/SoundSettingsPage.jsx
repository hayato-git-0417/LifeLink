import AppShell from '../../components/AppShell.jsx'
import BlockSlider from '../../components/BlockSlider.jsx'
import form from '../../styles/form.module.css'

export default function SoundSettingsPage({
  currentBgm,
  onSaveBgm,
  bgmVolume,
  onBgmVolumeChange,
}) {
  const maxBgmLevel = 15
  const bgmLevel = Math.round(bgmVolume * maxBgmLevel)

  function handleSave(event) {
    event.preventDefault()

    const select = event.currentTarget.querySelector('#home-bgm')
    const selectedBgm = select.value

    onSaveBgm(selectedBgm)
  }

  // この下に今の return を置きます

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
                    <option value="spring-breeze">spring-breeze-path</option>
                </select>
            </div>
            <div id="bgm-volume" className={`${form.card} ${form.field}`}>
                <div className={form.labelRow}>
                    <span className={form.label}>BGM音量</span>
                    <span className={form.label}>{bgmLevel}/{maxBgmLevel}</span>
                </div>
                <BlockSlider
                    label="BGM音量"
                    min={0}
                    max={maxBgmLevel}
                    step={1}
                    blockCount={maxBgmLevel}
                    value={bgmLevel}
                    onChange={(level) => onBgmVolumeChange(level / maxBgmLevel)}
                />
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