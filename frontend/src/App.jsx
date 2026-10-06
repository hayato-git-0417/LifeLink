// 画面の一覧（spec.md 5章）。まだ作っていない画面は仮ページ（フェーズ6・7で置き換える）
import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { GuestOnly, GOAL_SETUP_PATH, RequireUser } from './components/RouteGuards.jsx'
import GoalSetupPage from './pages/GoalSetupPage.jsx'
import HomePage from './pages/home/HomePage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import MealFormPage from './pages/meals/MealFormPage.jsx'
import MealListPage from './pages/meals/MealListPage.jsx'
import PlaceholderPage from './pages/PlaceholderPage.jsx'
import SignupPage from './signup/SignupPage.jsx'

// グラフ（Recharts）を使う画面は開いたときに読み込む（最初に読む JS を小さくするため）
const MealsPage = lazy(() => import('./pages/meals/MealsPage.jsx'))
const ExercisePage = lazy(() => import('./pages/exercise/ExercisePage.jsx'))

const PLACEHOLDERS = [
  { path: '/details', title: '詳細', phase: 7 },
  { path: '/mypage', title: 'マイページ', phase: 7 },
  { path: '/follows', title: 'フォロー一覧', phase: 7 },
  { path: '/users/:id', title: 'ユーザー', phase: 7 },
  { path: '/notifications', title: '通知', phase: 7 },
  { path: '/settings', title: '設定', phase: 7 },
  { path: '/settings/profile', title: 'プロフィール変更', phase: 7 },
  { path: '/settings/goal', title: '目標変更', phase: 7 },
]

export default function App() {
  return (
    <Suspense fallback={null}>
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
          {PLACEHOLDERS.map(({ path, title, phase }) => (
            <Route key={path} path={path} element={<PlaceholderPage title={title} phase={phase} />} />
          ))}
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
