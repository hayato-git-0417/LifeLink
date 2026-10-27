// 画面の一覧（spec.md 5章）
import { lazy, Suspense, useEffect, useRef } from 'react'
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

// グラフ（Recharts）を使う画面は開いたときに読み込む（最初に読む JS を小さくするため）。
// 食事トップの円グラフは CSS で描くので（components/Donut.jsx）ふつうに読み込む
const ExercisePage = lazy(() => import('./pages/exercise/ExercisePage.jsx'))
const DetailsPage = lazy(() => import('./pages/details/DetailsPage.jsx'))
const MyPage = lazy(() => import('./pages/social/MyPage.jsx'))

export default function App() {
  const location = useLocation()
  const { status } = useAuth()
  const bgmRef = useRef(null)

  /* クリック音 */
  useEffect(() => {
    // 効果音を準備する
    const sound = new Audio('/sounds/click1.mp3')
    sound.volume = 0.3

    function handleClick(event) {
      if (!(event.target instanceof Element)) return

      // 押した場所がボタンの中か確認する
      const button = event.target.closest('button')
      if (!button || button.disabled) return

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

  /* BGM */
  useEffect(() => {
    // 最初に1つだけ準備する
    if (!bgmRef.current) {
      const bgm = new Audio('/music/Breakfast_High_Score.mp3')
      bgm.loop = true
      bgm.volume = 0.1
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
  }, [status, location.pathname])

// Appが終了するときに停止する
  useEffect(() => {
    return () => {
      bgmRef.current?.pause()
    }
  }, [])

  return (
    <Suspense fallback={<p>読み込み中...</p>}>
      <Routes>
        <Route element={<GuestOnly />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
        </Route>
        <Route element={<RequireUser />}>
          <Route path={GOAL_SETUP_PATH} element={<GoalSetupPage />} />
          <Route path="/" element={<HomePage />} />
          <Route path="/meals" element={<MealsPage />} />
          <Route path="/meals/new" element={<MealFormPage />} />
          <Route path="/meals/list" element={<MealListPage />} />
          <Route path="/meals/:id/edit" element={<MealFormPage />} />
          <Route path="/exercise" element={<ExercisePage />} />
          <Route path="/details" element={<DetailsPage />} />
          <Route path="/mypage" element={<MyPage />} />
          <Route path="/follows" element={<FollowsPage />} />
          <Route path="/users/:id" element={<UserPage />} />
          <Route path="/users/:id/details" element={<DetailsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/profile" element={<ProfileEditPage />} />
          <Route path="/settings/goal" element={<GoalEditPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
