/*＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝ 
・URLに応じて画面を切り替える
・BGMとクリック音を管理する
＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝*/

/*【各画面を読み込む　（運動・詳細・マイページの3つは、画面を開くときに読み込む）】*/
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { GuestOnly, GOAL_SETUP_PATH, RequireUser } from './components/RouteGuards.jsx'
import { useAuth } from './auth/useAuth.js'
import GoalSetupPage from './pages/GoalSetupPage.jsx'
import HomePage from './pages/home/HomePage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import MealFormPage from './pages/meals/MealFormPage.jsx'
import MealListPage from './pages/meals/MealListPage.jsx'
import MealsPage from './pages/meals/MealsPage.jsx'
import NotificationsPage from './pages/notifications/NotificationsPage.jsx'
import GoalEditPage from './pages/settings/GoalEditPage.jsx'
import ProfileEditPage from './pages/settings/ProfileEditPage.jsx'
import SettingsPage from './pages/settings/SettingsPage.jsx'
import FollowsPage from './pages/social/FollowsPage.jsx'
import UserPage from './pages/social/UserPage.jsx'
import SignupPage from './signup/SignupPage.jsx'
import SoundSettingsPage from './pages/settings/SoundSettingsPage.jsx'
import HomeCustomizePage from './pages/home/HomeCustomizePage.jsx'
import FurniturePlacementPage from './pages/home/FurniturePlacementPage.jsx'
import RoomEditPage from './pages/home/RoomEditPage.jsx'

const ExercisePage = lazy(() => import('./pages/exercise/ExercisePage.jsx'))
const ExerciseTaskSettingsPage = lazy(() => import('./pages/exercise/ExerciseTaskSettingsPage.jsx'))
const DetailsPage = lazy(() => import('./pages/details/DetailsPage.jsx'))
const MyPage = lazy(() => import('./pages/social/MyPage.jsx'))


/*【BGMの一覧】*/
const BGM_TRACKS = [
  {
    id: 'hidamari',
    name: 'ひだまりのよりみち',
    src: '/music/hidamari-no-yorimichi-pop-100bpm.mp3',
  },
  {
    id: 'breakfast',
    name: 'Breakfast High Score',
    src: '/music/Breakfast_High_Score.mp3',
  },
  {
    id: 'tomato',
    name: 'tomato',
    src: '/music/tomato.wav',
  },
  {
    id: 'Morning Grove',
    name: 'Morning_in_the_Apricot_Grove',
    src: '/music/Morning_in_the_Apricot_Grove.mp3',
  },
  {
    id: 'スイカと夏休み',
    name: 'スイカと夏休み',
    src: '/music/スイカと夏休み.wav',
  },
  {
    id: 'spring-breeze',
    name: 'spring-breeze-path',
    src: '/music/spring-breeze-path.mp3',
  }
]

function useSavedRoomImage(storageKey, defaultImage) {
  const [saved, setSaved] = useState(null)

  const image = saved?.key === storageKey ? saved.image : defaultImage

  useEffect(() => {
    if (!storageKey) {
      setSaved(null)
      return
    }

    try {
      const image = localStorage.getItem(storageKey) ?? defaultImage
      setSaved({ key: storageKey, image })
    } catch (error) {
      console.warn('部屋の画像設定を読み込めませんでした', error)
    }
  }, [storageKey, defaultImage])

  function selectImage(nextImage) {
    if (!storageKey) return

    setSaved({ key: storageKey, image: nextImage })

    try {
      localStorage.setItem(storageKey, nextImage)
    } catch (error) {
      console.warn('部屋の画像設定を保存できませんでした', error)
    }
  }

  return [image, selectImage]
}

/*【】*/
export default function App() {
  const location = useLocation()  // 現在のURL
  const {status, user} = useAuth()    // ログイン状態
  const bgmRef = useRef(null)     // 
  const [currentBgm, setCurrentBgm] = useState(BGM_TRACKS[0].id)
  const [bgmVolume, setBgmVolume] = useState(0.1) // BGMボリューム（初期は10%）

  const furnitureKey = status === 'user' && user?.id != null
    ? `lifelink:placed-furniture:${user.id}`
    : null

  /* 壁の初期値 */
  const [wallImage, setWallImage] = useSavedRoomImage(
    furnitureKey ? `${furnitureKey}:wall` : null,
    '/room/wall/blue-stripe.png'
  )
  /* 床の初期値 */
  const [floorImage, setFloorImage] = useSavedRoomImage(
    furnitureKey ? `${furnitureKey}:floor` : null,
    '/room/floor/wood-floor.png'
  )

  const [roomImageDraft, setRoomImageDraft] = useState(null)
  const pendingRoomImages =
    roomImageDraft?.key === furnitureKey ? roomImageDraft : null

  const editingWallImage = pendingRoomImages?.wallImage ?? wallImage
  const editingFloorImage = pendingRoomImages?.floorImage ?? floorImage

  function updateRoomImageDraft(images) {
    if (!furnitureKey) return

    setRoomImageDraft((current) => ({
      ...(current?.key === furnitureKey ? current : {}),
      ...images,
      key: furnitureKey,
    }))
  }

  const [furnitureLayout, setFurnitureLayout] = useState(null)

  const placedFurniture = furnitureLayout?.key === furnitureKey
    ? furnitureLayout.items
    : []

  
  const [furnitureDraft, setFurnitureDraft] = useState(null)

  const editingFurniture = furnitureDraft?.key === furnitureKey
    ? furnitureDraft.items
    : placedFurniture

  const hasUnsavedFurnitureChanges =
    furnitureDraft?.key === furnitureKey &&
    JSON.stringify(furnitureDraft.items) !== JSON.stringify(placedFurniture)

  function updateFurnitureDraft(updateLayout) {
    setFurnitureDraft((current) => {
      const layout = current?.key === furnitureKey ? current : furnitureLayout
      if (!layout || layout.key !== furnitureKey) return current

      return updateLayout(layout)
    })
  }

  function handleSaveFurniture() {
    if (furnitureDraft && furnitureDraft.key === furnitureKey) {
      setFurnitureLayout(furnitureDraft)
    }
    if (editingWallImage !== wallImage) setWallImage(editingWallImage)
    if (editingFloorImage !== floorImage) setFloorImage(editingFloorImage)
    setRoomImageDraft(null)
    setFurnitureDraft(null)
  }

  useEffect(() => {
    const path = location.pathname
    const isEditingRoom = path === '/home/customize' || path.startsWith('/home/customize/')

    if (!isEditingRoom) {
      setFurnitureDraft(null)
      setRoomImageDraft(null)
    }
  }, [location.pathname])



  // ログインしたユーザーの配置を復元する
  useEffect(() => {
    if (!furnitureKey) {
      setFurnitureLayout(null)
      return
    }

    let items = []

    try {
      const saved = JSON.parse(localStorage.getItem(furnitureKey))
      if (Array.isArray(saved)) items = saved
    } catch (error) {
      console.warn('家具の配置を読み込めませんでした', error)
    }

    setFurnitureLayout({ key: furnitureKey, items })
  }, [furnitureKey])

  // 配置を読み込んだ後、設置や移動で変わった内容を保存する
  useEffect(() => {
    if (!furnitureLayout || furnitureLayout.key !== furnitureKey) return

    try {
      localStorage.setItem(furnitureKey, JSON.stringify(furnitureLayout.items))
    } catch (error) {
      console.warn('家具の配置を保存できませんでした', error)
    }
  }, [furnitureKey, furnitureLayout])

  /*【クリック音】*/
  useEffect(() => {
    // 効果音を準備する
    const sound = new Audio('/sounds/click1.mp3')
    sound.volume = 0.3

    function handleClick(event) {
      if (!(event.target instanceof Element)) return

      // 押した場所がボタンの中か確認する
      const button = event.target.closest('button') // ボタンクリック時の効果音
      if (!button || button.disabled) return

      if (button.dataset.clickSound === 'custom') return  // // 専用音のあるボタンでは、通常クリック音をスキップする

      // 音を先頭から再生する
      sound.currentTime = 0
      sound.play().catch((error) => {
        console.warn('効果音のURL:', sound.src)
        console.warn('音声エラー:', sound.error, error)
      })
    }

    // ボタン本来の処理より先にクリックを受け取る
    document.addEventListener('click', handleClick, true)

    // この処理が不要になったら監視と再生を止める
    return () => {
      document.removeEventListener('click', handleClick, true)
      sound.pause()
    }
  }, []);

  /*【BGM】*/
  useEffect(() => {
    // 最初に1つだけ準備する
    if (!bgmRef.current) {
      const bgm = new Audio(BGM_TRACKS[0].src)
      bgm.loop = true
      bgmRef.current = bgm
    }

    const bgm = bgmRef.current

    // 未ログインなら停止する
    if (status !== 'user') {
      bgm.pause()
      bgm.currentTime = 0
      return
    }

    // ホームに入ったときに再生を始める
    if (location.pathname !== '/') return

    function playBgm() {
      bgm.play().catch((error) => {
        if (error.name !== 'NotAllowedError') {
          console.warn('BGMを再生できませんでした', error)
        }
      })
    }

    playBgm()

    // 自動再生が制限された場合、最初のクリックで再試行する
    document.addEventListener('click', playBgm, {
      once: true,
      capture: true,
    })

    return () => {
      document.removeEventListener('click', playBgm, true)
    }
  }, [status, location.pathname]) // 最初と、ログイン状態またはURLのパスが変わったときに実行

  /*【Appが終了するときに停止する】*/
  useEffect(() => {
    return () => {
      bgmRef.current?.pause()
    }
  }, [])

  /*【音量変更】*/
  useEffect(() => {
    if (bgmRef.current) {
      bgmRef.current.volume = bgmVolume
    }
  }, [bgmVolume]) // 最初と、BGM音量が変わったときに実行

  /*【サウンド設定保存時、選ばれた曲IDから音声ファイルを探して曲を切り替える】*/
  function handleBgmChange(selectedBgm) {
    const track = BGM_TRACKS.find((track) => track.id === selectedBgm)
    const bgm = bgmRef.current

    if (!track || !bgm) return

    bgm.src = track.src
    setCurrentBgm(track.id)

    bgm.play().catch((error) => {
      console.warn('BGMを再生できませんでした', error)
    })
  }

  function handlePlaceFurniture(furniture) {
    updateFurnitureDraft((current) => {
      if (!current || current.key !== furnitureKey) return current

      const placementId = furniture.placementId ?? (
        current.items.reduce((max, item) => Math.max(max, item.placementId), 0) + 1
      )
      const item = { ...furniture, placementId }

      const items = current.items.some((placed) => placed.placementId === placementId)
        ? current.items.map((placed) => placed.placementId === placementId ? item : placed)
        : [...current.items, item]

      return { ...current, items }
    })
  }

  function handleRemoveFurniture(placementId) {
    updateFurnitureDraft((current) => {
      if (!current || current.key !== furnitureKey) return current

      return {
        ...current,
        items: current.items.filter((item) => item.placementId !== placementId),
      }
    })
  }


  /*【プリセット】*/
  const presetKey = furnitureKey ? `${furnitureKey}:presets` : null
  const [presetStore, setPresetStore] = useState(null)
  const roomPresets = presetStore?.key === presetKey ? presetStore.items : []

  useEffect(() => {
    if (!presetKey) {
      setPresetStore(null)
      return
    }

    try {
      const saved = JSON.parse(localStorage.getItem(presetKey))
      setPresetStore({ key: presetKey, items: Array.isArray(saved) ? saved : [] })
    } catch (error) {
      console.error('プリセットを読み込めませんでした', error)
      setPresetStore(null)
    }
  }, [presetKey])

  function saveRoomPreset(inputName) {
    const name = inputName.trim()

    if (!name) return 'プリセット名を入力してください。'
    if (!presetKey || presetStore?.key !== presetKey) {
      return 'プリセットを読み込めませんでした。'
    }
    if (roomPresets.some((preset) => preset.name === name)) {
      return 'その名前はすでに使われています。'
    }

    const items = [
      ...roomPresets,
      {
        name,
        wallImage: editingWallImage,
        floorImage: editingFloorImage,
        furniture: editingFurniture,
      },
    ]

    try {
      localStorage.setItem(presetKey, JSON.stringify(items))
      setPresetStore({ key: presetKey, items })
      return ''
    } catch (error) {
      console.error('プリセットを保存できませんでした', error)
      return 'プリセットを保存できませんでした。'
    }
  }

  function removeRoomPreset(name) {
    if (!presetKey || presetStore?.key !== presetKey) {
      return 'プリセットを読み込めませんでした。'
    }

    const items = presetStore.items.filter((preset) => preset.name !== name)

    try {
      localStorage.setItem(presetKey, JSON.stringify(items))
      setPresetStore({ key: presetKey, items })
      return ''
    } catch (error) {
      console.error('プリセットを削除できませんでした', error)
      return 'プリセットを削除できませんでした。'
    }
  }

  function applyRoomPreset(preset) {
    if (!furnitureKey) return

    updateRoomImageDraft({
      wallImage: preset.wallImage,
      floorImage: preset.floorImage,
    })
    setFurnitureDraft({ key: furnitureKey, items: preset.furniture })
  }

  function renameRoomPreset(oldName, inputName) {
    const name = inputName.trim()
    if (!name) return 'プリセット名を入力してください。'

    if (!presetKey || presetStore?.key !== presetKey) {
      return 'プリセットを読み込めませんでした。'
    }

    if (name === oldName) return ''

    if (presetStore.items.some((preset) => preset.name === name)) {
      return 'その名前はすでに使われています。'
    }

    const items = presetStore.items.map((preset) =>
      preset.name === oldName ? { ...preset, name } : preset
    )

    try {
      localStorage.setItem(presetKey, JSON.stringify(items))
      setPresetStore({ key: presetKey, items })
      return ''
    } catch (error) {
      console.error('プリセット名を変更できませんでした', error)
      return 'プリセット名を変更できませんでした。'
    }
  }


  /*【URLごとに表示する画面を指定】*/
  /*【サウンド設定画面には、現在の曲・音量と、それらを変更するための関数を渡す】*/
  return (
    <Suspense fallback={<p>読み込み中...</p>}>
      <Routes>
        <Route element={<GuestOnly />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
        </Route>
        <Route element={<RequireUser />}>
        <Route path={GOAL_SETUP_PATH} element={<GoalSetupPage />} />

        <Route
          path="/"
          element={
          <HomePage
            wallImage={wallImage}
            floorImage={floorImage}
            placedFurniture={placedFurniture}
          />}
        />

        <Route
          path="/home/customize/place"
          element={
          <FurniturePlacementPage
            wallImage={editingWallImage}
            floorImage={editingFloorImage}
            onPlaceFurniture={handlePlaceFurniture}
            onRemoveFurniture={handleRemoveFurniture}
            placedFurniture={editingFurniture}
          />
          }
        />

        <Route
          path="/home/customize"
          element={
            <HomeCustomizePage
              wallImage={editingWallImage}
              floorImage={editingFloorImage}
              onSelectWall={(image) => updateRoomImageDraft({ wallImage: image })}
              onSelectFloor={(image) => updateRoomImageDraft({ floorImage: image })}
            />
          }
        />
        <Route
          path="/home/customize/edit"
          element={
            <RoomEditPage
              wallImage={editingWallImage}
              floorImage={editingFloorImage}
              placedFurniture={editingFurniture}
              onSaveFurniture={handleSaveFurniture}
              hasUnsavedFurnitureChanges={
                hasUnsavedFurnitureChanges ||
                editingWallImage !== wallImage ||
                editingFloorImage !== floorImage
              }
              roomPresets={roomPresets}
              onSaveRoomPreset={saveRoomPreset}
              onRemoveRoomPreset={removeRoomPreset}
              onApplyRoomPreset={applyRoomPreset}
              onRenameRoomPreset={renameRoomPreset}
            />
          }
        />

          <Route path="/meals" element={<MealsPage />} />
          <Route path="/meals/new" element={<MealFormPage />} />
          <Route path="/meals/list" element={<MealListPage />} />
          <Route path="/meals/:id/edit" element={<MealFormPage />} />
          <Route path="/exercise" element={<ExercisePage />} />
          <Route path="/exercise/tasks" element={<ExerciseTaskSettingsPage />} />
          <Route path="/details" element={<DetailsPage />} />
          <Route path="/mypage" element={<MyPage />} />
          <Route path="/follows" element={<FollowsPage />} />
          <Route path="/users/:id" element={<UserPage />} />
          <Route path="/users/:id/details" element={<DetailsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/profile" element={<ProfileEditPage />} />
          <Route path="/settings/goal" element={<GoalEditPage />} />
          <Route path="/settings/sound" element={
              <SoundSettingsPage
                currentBgm={currentBgm}
                onSaveBgm={handleBgmChange}
                bgmVolume={bgmVolume}
                onBgmVolumeChange={setBgmVolume}
              />
            }
          />
        </Route>
      </Routes>
    </Suspense>
  )
}
