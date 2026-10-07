// フォロー一覧（デザイン p.4）。フォロワー／フォロー中のタブ、ユーザー名検索、フォローする／外す。
// 検索している間はタブの一覧の代わりに検索結果（名前の部分一致・20件まで）を出す
import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../../api/client.js'
import { useAuth } from '../../auth/useAuth.js'
import AppShell from '../../components/AppShell.jsx'
import ErrorList from '../../components/ErrorList.jsx'
import form from '../../styles/form.module.css'
import styles from './Social.module.css'
import UserList from './UserList.jsx'

const TABS = [
  { key: 'followers', label: 'フォロワー', empty: 'まだフォロワーはいません。' },
  { key: 'followings', label: 'フォロー中', empty: 'まだ誰もフォローしていません。上の検索から探せます。' },
]

export default function FollowsPage() {
  const { user, refreshMe } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = TABS.find((entry) => entry.key === searchParams.get('tab')) || TABS[0]
  const [users, setUsers] = useState(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null) // 検索結果（検索していないときは null）
  const [errors, setErrors] = useState([])
  const [searching, setSearching] = useState(false)
  // 検索をやめたら一覧を取り直す（検索中にフォローした人をフォロー中に出すため）
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let active = true
    api(`/users/${user.id}/${tab.key}`)
      .then((data) => active && setUsers(data.users))
      .catch((error) => active && setErrors(error.messages))
    return () => {
      active = false
    }
  }, [user.id, tab.key, version])

  async function search(event) {
    event.preventDefault()
    const q = query.trim()
    if (!q) return setResults(null)
    setSearching(true)
    setErrors([])
    try {
      const data = await api('/users', { params: { q } })
      setResults(data.users)
    } catch (error) {
      setErrors(error.messages)
    } finally {
      setSearching(false)
    }
  }

  const clearSearch = () => {
    setQuery('')
    if (!results) return
    setResults(null)
    setUsers(null)
    setVersion((value) => value + 1)
  }

  const changeTab = (key) => {
    if (key === tab.key && !results) return
    clearSearch()
    if (key !== tab.key) {
      setUsers(null)
      setSearchParams({ tab: key }, { replace: true })
    }
  }

  // フォローする／外したら、表示中の一覧の印と自分のフォロー数を更新する
  const handleFollowChange = useCallback(
    (target, data) => {
      const mark = (list) => list?.map((row) => (row.id === target.id ? { ...row, following: data.following } : row))
      setUsers(mark)
      setResults(mark)
      refreshMe().catch(() => {})
    },
    [refreshMe],
  )

  return (
    <AppShell title="フォロー一覧" backTo="/mypage">
      <div className={styles.page}>
        <div className={styles.tabs} role="tablist">
          {TABS.map((entry) => (
            <button
              key={entry.key}
              type="button"
              role="tab"
              aria-selected={!results && entry.key === tab.key}
              className={`${styles.tab} ${!results && entry.key === tab.key ? styles.tabActive : ''}`}
              onClick={() => changeTab(entry.key)}
            >
              {entry.label}
              <span className={styles.tabCount}>
                {entry.key === 'followers' ? (user.followers_count ?? 0) : (user.followings_count ?? 0)}
              </span>
            </button>
          ))}
        </div>

        <form className={styles.search} onSubmit={search} role="search">
          <input
            className={form.input}
            type="search"
            placeholder="ユーザー名で検索"
            value={query}
            maxLength={50}
            onChange={(event) => {
              setQuery(event.target.value)
              if (!event.target.value && results) clearSearch()
            }}
            aria-label="ユーザー名で検索"
          />
          <button type="submit" className={`${form.button} ${form.primary} ${styles.searchButton}`} disabled={searching}>
            検索
          </button>
        </form>

        <ErrorList errors={errors} />
        {results ? (
          <>
            <p className={styles.resultHead}>
              「{query.trim()}」の検索結果（{results.length}件{results.length >= 20 ? '・上位20件' : ''}）
              <button type="button" className={form.linkButton} onClick={clearSearch}>
                検索をやめる
              </button>
            </p>
            <UserList
              users={results}
              emptyText="見つかりませんでした。"
              onFollowChange={handleFollowChange}
              onError={setErrors}
            />
          </>
        ) : users ? (
          <UserList users={users} emptyText={tab.empty} onFollowChange={handleFollowChange} onError={setErrors} />
        ) : (
          !errors.length && <p className={styles.empty}>読み込み中…</p>
        )}
      </div>
    </AppShell>
  )
}
