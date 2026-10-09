# sotuken_b02 — 生活リズム改善ゲーム

卒業研究チーム開発の Web アプリ。Rails（API モード）＋ React（`frontend/`、フェーズ5で作成）。
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

## テスト

```powershell
bundle exec rails test
```

初回だけ `ruby bin/rails db:test:prepare` が必要な場合がある。

## API の試し方（PowerShell の Invoke-RestMethod）

すべて `/api/v1` 配下。ログイン後はレスポンスヘッダーの `access-token` / `client` / `uid` を次のリクエストに付ける。
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

# 自分の情報（goal_registered が false なら目標設定へ誘導する）
Invoke-RestMethod "$base/me" -Headers $h

# 目標を保存（新規登録③④・目標変更。運動タスクは配列の順が表示順）
Invoke-RestMethod -Method Put "$base/goal" -Headers $h -ContentType "application/json; charset=utf-8" -Body (To-Utf8Json @{
  goal = @{
    sleep_goal_type = "time_range"; bedtime = "00:00"; wake_time = "07:00"; work_goal_minutes = 420
    calorie_goal = 2600; protein_goal_g = 65; fat_goal_g = 72.2; carbs_goal_g = 373.8; fiber_goal_g = 20
    breakfast_time = "07:00"; lunch_time = "12:00"; dinner_time = "19:00"
  }
  exercise_tasks = @(@{ title = "1キロ走る" }, @{ title = "腕立て伏せ100回" })
})

# 目標の取得・プロフィール変更
Invoke-RestMethod "$base/goal" -Headers $h
Invoke-RestMethod -Method Patch "$base/me" -Headers $h -ContentType "application/json; charset=utf-8" -Body (To-Utf8Json @{ user = @{ name = "じろう2" } })

# ログアウト
Invoke-RestMethod -Method Delete "$base/auth/sign_out" -Headers $h
```

エラーはすべて `{ "errors": ["..."] }` の形で、422（入力エラー）・401（未ログイン）・404（見つからない）を返す。
