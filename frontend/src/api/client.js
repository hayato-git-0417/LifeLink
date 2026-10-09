// API クライアント。すべて /api/v1 配下（Vite の proxy で Rails へ）。
// devise_token_auth のヘッダー（access-token / client / uid）を localStorage に保存して毎回付ける。
// トークンはリクエストのたびに入れ替わる（1つ前まで有効）ので、レスポンスに入っていたら必ず保存し直す。
const STORAGE_KEY = 'sotuken_b02.auth'
const AUTH_HEADERS = ['access-token', 'client', 'uid']

let unauthorizedHandler = null

// 401 のときに呼ぶ処理（AuthContext がログイン画面へ戻す）
export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler
}

export function loadAuth() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null
  } catch {
    return null
  }
}

export function hasAuth() {
  return loadAuth() !== null
}

function saveAuth(auth) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(auth))
}

export function clearAuth() {
  localStorage.removeItem(STORAGE_KEY)
}

// API のエラー。messages はそのまま画面に出せる日本語の配列
export class ApiError extends Error {
  constructor(status, messages) {
    super(messages.join('\n'))
    this.status = status
    this.messages = messages
  }
}

function storeAuthHeaders(response) {
  const token = response.headers.get('access-token')
  if (!token) return
  saveAuth(Object.fromEntries(AUTH_HEADERS.map((name) => [name, response.headers.get(name)])))
}

// api('/me') / api('/goal', { method: 'PUT', body: {...} })
// body が FormData のときは multipart（写真）、それ以外は JSON で送る
export async function api(path, { method = 'GET', body, params } = {}) {
  const headers = { Accept: 'application/json' }
  const auth = loadAuth()
  if (auth) Object.assign(headers, auth)

  let payload
  if (body instanceof FormData) {
    payload = body
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  const query = params ? `?${new URLSearchParams(params)}` : ''
  let response
  try {
    response = await fetch(`/api/v1${path}${query}`, { method, headers, body: payload })
  } catch {
    throw new ApiError(0, ['サーバーに接続できません。Rails のサーバーが起動しているか確認してください。'])
  }

  storeAuthHeaders(response)

  const text = await response.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }
  }

  if (!response.ok) {
    // ログイン中だったのに 401 → トークン切れ。ログイン画面へ戻す
    if (response.status === 401 && auth) {
      clearAuth()
      unauthorizedHandler?.()
    }
    const messages = Array.isArray(data?.errors) ? data.errors : [`エラーが発生しました（${response.status}）`]
    throw new ApiError(response.status, messages)
  }
  return data
}
