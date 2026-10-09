// 画面の一覧（spec.md 5章）
import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { GuestOnly, GOAL_SETUP_PATH, RequireUser } from './components/RouteGuards.jsx'
import GoalSetupPage from './pages/GoalSetupPage.jsx'
import HomePage from './pages/home/HomePage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import MealFormPage from './pages/meals/MealFormPage.jsx'
import MealListPage from './pages/meals/MealListPage.jsx'
import NotificationsPage from './pages/notifications/NotificationsPage.jsx'
import GoalEditPage from './pages/settings/GoalEditPage.jsx'
import ProfileEditPage from './pages/settings/ProfileEditPage.jsx'
import SettingsPage from './pages/settings/SettingsPage.jsx'
import FollowsPage from './pages/social/FollowsPage.jsx'
import UserPage from './pages/social/UserPage.jsx'
import SignupPage from './signup/SignupPage.jsx'

// グラフ（Recharts）を使う画面は開いたときに読み込む（最初に読む JS を小さくするため）
const MealsPage = lazy(() => import('./pages/meals/MealsPage.jsx'))
const ExercisePage = lazy(() => import('./pages/exercise/ExercisePage.jsx'))
const DetailsPage = lazy(() => import('./pages/details/DetailsPage.jsx'))
const MyPage = lazy(() => import('./pages/social/MyPage.jsx'))

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
          <Route path="/details" element={<DetailsPage />} />
          <Route path="/mypage" element={<MyPage />} />
          <Route path="/follows" element={<FollowsPage />} />
          <Route path="/users/:id" element={<UserPage />} />
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
