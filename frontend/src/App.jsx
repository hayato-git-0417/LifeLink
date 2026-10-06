// 画面の一覧（spec.md 5章）。まだ作っていない画面は仮ページ（フェーズ6・7で置き換える）
import { Navigate, Route, Routes } from 'react-router-dom'
import { GuestOnly, GOAL_SETUP_PATH, RequireUser } from './components/RouteGuards.jsx'
import GoalSetupPage from './pages/GoalSetupPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import PlaceholderPage from './pages/PlaceholderPage.jsx'
import SignupPage from './signup/SignupPage.jsx'

const PLACEHOLDERS = [
  { path: '/', title: 'ホーム', phase: 6 },
  { path: '/meals', title: '食事', phase: 6 },
  { path: '/meals/new', title: '食事を記録', phase: 6 },
  { path: '/exercise', title: '運動', phase: 6 },
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
    <Routes>
      <Route element={<GuestOnly />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Route>
      <Route element={<RequireUser />}>
        <Route path={GOAL_SETUP_PATH} element={<GoalSetupPage />} />
        {PLACEHOLDERS.map(({ path, title, phase }) => (
          <Route key={path} path={path} element={<PlaceholderPage title={title} phase={phase} />} />
        ))}
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
