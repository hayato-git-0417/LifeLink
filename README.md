# sotuken_b02 — 生活リズム改善ゲーム

卒業研究チーム開発の Web アプリ。Rails（API モード）＋ React（`frontend/`、Vite・React Router・CSS Modules）。
仕様は `docs/spec.md`、DB 設計は `docs/db_design.md`、仮決めは `docs/decisions.md`。
README の詳しい環境構築手順はフェーズ8でまとめる。ここには今使える手順だけを書く。

## 動かし方（Windows / PowerShell）

```powershell
cd D:\g2\sotuken_b\sotuken_b02
bundle install
# .env.example をコピーして .env を作り、自分の MySQL のパスワードを書く
ruby bin/rails db:create
ruby bin/rails db:migrate
ruby bin/rails db:seed      # キャラ画像・栄養基準・デモユーザー
ruby bin/rails s            # http://localhost:3000
```

デモユーザー: `demo1@example.com`（たろう）／`demo2@example.com`（はなこ）、パスワードはどちらも `password`。

## ブラウザで使う（Rails と Vite を両方起動する）

ターミナルを2つ開く。ブラウザで開くのは **http://localhost:5173**（Vite）。
`/api`・`/characters`・`/rails/active_storage` は Vite が Rails（localhost:3000）へ転送するので、Rails も起動しておく。

```powershell
# ターミナル1: Rails（API）
cd D:\g2\sotuken_b\sotuken_b02
ruby bin/rails s

# ターミナル2: React（初回だけ npm install）
cd D:\g2\sotuken_b\sotuken_b02\frontend
npm install
npm run dev                 # http://localhost:5173
```

- スマホ幅で見るときは、ブラウザの開発者ツール（F12）→ デバイスツールバー（Ctrl+Shift+M）で幅 375 などにする。
- 画面に「サーバーに接続できません」と出たら、ターミナル1の Rails が止まっている。
- ログイン状態はブラウザの localStorage（`sotuken_b02.auth`）に入る。おかしくなったら開発者ツールの Application → Local Storage で消す。

### 画面で確かめる（記録するとキャラの状態が変わる）

1. `demo1@example.com` / `password` でログインし、ホームのキャラの状態（キャラの下の「めばえ・○○」）と吹き出しを見る。
2. 「就寝」→ 背景が夜になり「睡眠中」。ワーク開始は押せない。「起床」→ 睡眠時間が出る。
3. 「ワーク開始」→「勉強中」、ボタンに経過時間。「ワークの計測を取り消す」で記録を残さずに戻る。
4. 「食事」→「📷 記録する」で写真（任意）・内容・栄養を入れて記録 → 食事トップの円グラフと PFC が増える → ホームに戻ると「満腹」（食後90分）。
5. 「運動」→ タスクにチェック（🔥）→ ホームに戻ると「汗汗」（30分間）。移動距離を入れると7日グラフの今日の棒が伸びる。
6. 朝・昼・夕の食事時刻から1時間たっても記録がないと「空腹」になり、ベルに通知が付く。
7. メニュー≡ →「記録の詳細」: タブ（睡眠／食事／運動／ワーク）で期間の合計・スコア（棒）とポイント（線）のグラフ・記録の一覧。‹ › で前後の週へ。睡眠・ワークは「修正」で開始・終了日時を直す（終了が開始より前ならエラー）、「削除」で消す。直すとグラフのスコアも変わる。
8. 下部ナビ「マイページ」: アイコン・名前・フォロワー数／フォロー中数・総合の7日グラフ。数を押すとフォロー一覧。
9. フォロー一覧で「demo」と検索 →「フォローする」→「検索をやめる」でフォロー中に出る。名前を押すと相手のページ（アイコン・名前・フォロー数・キャラの状態・総合ポイントだけ）。
10. フォローされた側（demo2）でログインすると、ベルに未読数。通知を開くと未読が強調され、ベルの数は 0 になる。
11. メニュー≡ →「設定」: プロフィール変更（アイコン・名前・生年月日・性別）、目標の設定（今の目標が入った状態で開く）、ログアウト（確認あり）。保存すると設定に戻り「保存しました」が出る。

## テスト

```powershell
bundle exec rails test       # Rails
cd frontend; npm run build   # React（ビルドが通るか）。npm run lint で静的チェック
```

初回だけ `ruby bin/rails db:test:prepare` が必要な場合がある。

## API の試し方（PowerShell の Invoke-RestMethod）

すべて `/api/v1` 配下。ログイン後はレスポンスヘッダーの `access-token` / `client` / `uid` を次のリクエストに付ける。
トークンはリクエストのたびに入れ替わる（1つ前のトークンまで有効。5秒以内の連続リクエストは同じトークン）ので、
続けて試すときは下の `Api` 関数のように、返ってきた `access-token` で `$h` を更新する。
日本語を送るときは本文を UTF-8 のバイト列にする（Windows PowerShell 5.1 の文字化け対策）。

```powershell
$base = "http://localhost:3000/api/v1"
# 先頭の「,」はバイト配列がばらされないようにするため
function To-Utf8Json($obj) { , [Text.Encoding]::UTF8.GetBytes(($obj | ConvertTo-Json -Depth 5)) }

# 新規登録①: メールが使えるか
Invoke-RestMethod "$base/registrations/email_available?email=new@example.com"

# 新規登録④の前: 生年月日・性別から栄養目標の初期値（ログイン不要）
Invoke-RestMethod "$base/goal/nutrition_defaults?birthdate=2006-10-13&gender=male"

# 新規登録（①②をまとめて送る。キャラも作られる）
Invoke-RestMethod -Method Post "$base/auth" -ContentType "application/json; charset=utf-8" -Body (To-Utf8Json @{
  email = "new@example.com"; password = "password"; password_confirmation = "password"
  name = "じろう"; icon = "penguin"; birthdate = "2006-10-13"; gender = "male"
})

# ログインしてトークンのヘッダーを取っておく
$res = Invoke-WebRequest -Method Post "$base/auth/sign_in" -UseBasicParsing -ContentType "application/json; charset=utf-8" `
  -Body (To-Utf8Json @{ email = "new@example.com"; password = "password" })
$h = @{ "access-token" = $res.Headers["access-token"]; client = $res.Headers["client"]; uid = $res.Headers["uid"] }

# 以降は Api 関数で呼ぶ（返ってきたトークンで $h を更新する）
function Api($method, $path, $body) {
  $params = @{ Method = $method; Uri = "$base$path"; Headers = $h; UseBasicParsing = $true; ContentType = "application/json; charset=utf-8" }
  if ($body) { $params.Body = To-Utf8Json $body }
  $r = Invoke-WebRequest @params
  if ($r.Headers["access-token"]) { $script:h["access-token"] = $r.Headers["access-token"] }
  if ($r.Content) { $r.Content | ConvertFrom-Json }
}

# 自分の情報（goal_registered が false なら目標設定へ誘導する）
Api Get "/me"

# 目標を保存（新規登録③④・目標変更。運動タスクは配列の順が表示順）
Api Put "/goal" @{
  goal = @{
    sleep_goal_type = "time_range"; bedtime = "00:00"; wake_time = "07:00"; work_goal_minutes = 420
    calorie_goal = 2600; protein_goal_g = 65; fat_goal_g = 72.2; carbs_goal_g = 373.8; fiber_goal_g = 20
    breakfast_time = "07:00"; lunch_time = "12:00"; dinner_time = "19:00"
  }
  exercise_tasks = @(@{ title = "1キロ走る" }, @{ title = "腕立て伏せ100回" })
}

# 目標の取得・プロフィール変更
Api Get "/goal"
Api Patch "/me" @{ user = @{ name = "じろう2" } }

```

### 記録（フェーズ3）

上の続き（`$base`・`$h`・`Api` を定義した状態）で試す。日時は日本時間の ISO 8601（`2026-10-06T07:00:00+09:00`）。

```powershell
# 睡眠: 就寝 → 起床（ホームのボタン）。集計日は起床した日
Api Post "/sleep_records/start"
Api Post "/sleep_records/finish"
# 計測中の押し間違いは取り消し（記録は消える）
Api Post "/sleep_records/cancel"
# 一覧（from, to は集計日。省略時は今日までの7日）
Api Get "/sleep_records?from=2026-10-01&to=2026-10-07"
# 修正・削除（詳細画面）。:id は一覧の id
Api Patch "/sleep_records/1" @{ sleep_record = @{ slept_at = "2026-10-05T23:30:00+09:00"; woke_at = "2026-10-06T07:00:00+09:00" } }
Api Delete "/sleep_records/1"

# ワーク: 開始（内容は任意）→ 終了。睡眠中は開始できない（422）。就寝するとワークは自動終了
Api Post "/work_records/start" @{ work_record = @{ title = "卒研" } }
Api Post "/work_records/finish"
Api Get "/work_records"

# 運動: 移動距離の手入力と一覧（daily_totals は 7日グラフ用の日ごとの合計）
Api Post "/exercise_records" @{ exercise_record = @{ distance_km = 2.5; memo = "ジョギング" } }
Api Get "/exercise_records"
# 運動タスク: 今日のチェックリスト、チェックを付ける／外す（:id は exercise_tasks の id）
Api Get "/exercise_tasks/today"
Api Post "/exercise_tasks/1/completion"
Api Delete "/exercise_tasks/1/completion"

# 食事（写真なし）。meal_type は breakfast / lunch / dinner / snack
Api Post "/meals" @{ meal = @{ meal_type = "lunch"; eaten_at = "2026-10-06T12:15:00+09:00"; content = "カレーライス"
  calories = 750; protein_g = 20.5; fat_g = 25; carbs_g = 110.2; fiber_g = 4.5; comment = "大盛り" } }
Api Get "/meals?date=2026-10-06"
Api Patch "/meals/1" @{ meal = @{ calories = 700 } }
Api Patch "/meals/1" @{ meal = @{ remove_photo = $true } }   # 写真を外す
Api Delete "/meals/1"

# ログアウト
Api Delete "/auth/sign_out"
```

写真つきの食事は multipart で送る。Windows PowerShell 5.1 の `Invoke-RestMethod` は multipart を作れないので `curl.exe` を使う
（ログアウト前に実行。日本語は文字化けしやすいので、写真つきの確認では英数字か JSON で直す）。
レスポンスの `photo_url`（`/rails/active_storage/...`）をブラウザで開くと写真が見られる。

```powershell
curl.exe -s -X POST "$base/meals" -H "access-token: $($h['access-token'])" -H "client: $($h.client)" -H "uid: $($h.uid)" `
  -F "meal[meal_type]=dinner" -F "meal[eaten_at]=2026-10-06T19:00:00+09:00" -F "meal[calories]=650" `
  -F "meal[photo]=@C:\Users\you\Pictures\dinner.jpg"
```

エラーはすべて `{ "errors": ["..."] }` の形で、422（入力エラー）・401（未ログイン）・404（見つからない）を返す。

### ホーム・スコア・ポイント（フェーズ4）

ホームを開く（`GET /home`）と、止め忘れの自動終了 → 前日までの確定（キャラのポイントへ反映） → 今日のスコアの計算 → キャラの状態判定 → 通知の作成 の順に処理してから返す。
デモユーザーは登録日が8日前・7日分の記録つきなので、`db:seed` 直後に1回開くと7日分が確定してポイントが変わる。2回目以降は変わらない。

```powershell
# demo1 でログインして $h を作り直し、ホームを開く
$res = Invoke-WebRequest -Method Post "$base/auth/sign_in" -UseBasicParsing -ContentType "application/json; charset=utf-8" `
  -Body (To-Utf8Json @{ email = "demo1@example.com"; password = "password" })
$h = @{ "access-token" = $res.Headers["access-token"]; client = $res.Headers["client"]; uid = $res.Headers["uid"] }
Api Get "/home" | ConvertTo-Json -Depth 5     # character（状態・画像・気分・ポイント）/ today / timers / message / 未読数
Api Get "/daily_achievements?from=2026-10-01&to=2026-10-07" | ConvertTo-Json -Depth 5   # スコアとポイントの推移
```

確定をやり直したいときは `ruby bin/rails db:seed`（デモユーザーを作り直す）。

### フォロー・通知（フェーズ7）

```powershell
Api Get "/users?q=demo"                    # 名前の部分一致・自分を除く・20件まで（following 付き）
Api Get "/users/2"                         # 他人のページ（アイコン・名前・フォロー数・キャラの状態・総合ポイントだけ）
Api Post "/users/2/follow"                 # フォローする（相手に follow 通知。フォロー済みならそのまま成功）
Api Delete "/users/2/follow"               # 外す
Api Get "/users/1/followers"               # 自分の一覧だけ（他人の id は 404）
Api Get "/users/1/followings"
Api Get "/notifications"                   # 新しい順50件と unread_count
Api Patch "/notifications/1/read"          # 1件既読
Api Post "/notifications/read_all"         # まとめて既読（通知の画面を開いたとき）
Api Get "/meals?from=2026-10-01&to=2026-10-07"   # 食事の期間の一覧（詳細画面の食事タブ）
```
