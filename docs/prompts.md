# Claude Code への依頼文（フェーズ別）

使い方
1. このキット（`CLAUDE.md`・`docs/`・`public/characters/`）をリポジトリ `D:\g2\sotuken_b\sotuken_b` の直下にコピーしてコミットする。
2. リポジトリ直下で Claude Code を起動し、下の **フェーズ0** から順に 1 つずつ貼り付ける。
3. 各フェーズの最後に Claude が出す「動作確認の手順」を自分で試し、OK なら次へ。おかしければその場で直してもらう。
4. 【仮】の仕様をチームで決め直したら、先に `docs/spec.md` を書き換えてから続きを依頼する。

---

## フェーズ0 ― 読み込みと計画（コードは書かせない）

```
これから卒業研究のWebアプリ「生活リズム改善ゲーム（sotuken_b）」を一緒に作ります。
まだコードは書かないでください。

1. CLAUDE.md、docs/spec.md、docs/db_design.md を読み、docs/design/ の画像（screen_p01〜p18、flow_1〜5、character_sheet）を見てください。
2. 現在のリポジトリの状態（Gemfile、config/database.yml、.env.example、.gitignore、db/）を確認してください。.env の中身は表示しないでください。
3. 次の3つを出してください。
   (a) 仕様の理解の要約（10行以内）
   (b) spec.md と db_design.md・画面デザインの食い違いや、実装前に決めるべき点の一覧（重要度順。spec.md で【仮】になっている点のうち、実装に影響が大きいもの）
   (c) docs/prompts.md のフェーズ1〜8に沿った作業計画（各フェーズで作るファイルと確認方法）
4. docs/decisions.md を作り、見出しと表（日付｜内容｜理由｜状態）だけ用意してください。

私が (b) に回答してから、フェーズ1に進みます。
```

---

## フェーズ1 ― DB とモデル

```
フェーズ1：DBとモデルを作ってください。作業ブランチ feature/db-models を切ってから始めてください。

- Gemfile に devise_token_auth（1.2.6以上）を追加し bundle install。active_storage:install を実行。
- docs/db_design.md の「マイグレーション（作成順）」どおりに15テーブルを作成。users は devise_token_auth:install のジェネレータが作るファイルを db_design.md のコードに合わせて書き換える。
- config/application.rb に config.time_zone = "Tokyo"、i18n の既定を ja に。
- 各モデルに enum・関連（db_design.md の「リレーション」）・バリデーションを定義。
  follows は自分自身のフォロー禁止、exercise_tasks は active=false で論理削除。
- config/game.yml を作り、spec.md 3章・4章の定数（重み・基準スコア・倍率・初期ポイント・上下限・状態判定のしきい値）を入れ、読み出す GameConfig を用意。
- db/seeds.rb：
  - character_animations に8状態分（gif_path は /characters/<key>.png）
  - nutrition_standards に「日本人の食事摂取基準（2025年版）」の 18歳以上の男女・身体活動レベル「ふつう」の値。
    数値が確かでないものは推測で埋めず、コメントで「要確認」と書き、出典の表名を残してください。
  - 動作確認用のデモユーザー2人（フォロー関係・7日分の記録つき）。
- ruby bin/rails db:migrate と db:seed が通ること、モデルのテストが通ることを確認。

完了したら、作ったテーブル一覧・確認手順・decisions.md に追記した仮決めを報告してください。
```

---

## フェーズ2 ― 認証・新規登録・目標設定 API

```
フェーズ2：認証と新規登録・目標設定のAPIを作ってください（ブランチ feature/auth）。

- devise_token_auth を /api/v1/auth にマウント。新規登録で name, icon, birthdate, gender を受け取れるようにする。
  新規登録はフロントで①〜④をまとめて送る前提（spec.md 5章）。
- 新規登録の完了時に characters（初期ポイント500、last_reset_on=今日）を作成。
- GET /api/v1/registrations/email_available、GET/PATCH /api/v1/me。
- GET/PUT /api/v1/goal（運動タスクの追加・並べ替え・削除を一緒に受け取る）と GET /api/v1/goal/nutrition_defaults（年齢・性別から nutrition_standards を引く。性別未回答・該当なしは女性/男性の平均などの決め方を decisions.md に書く）。
- 他人のデータに触れないこと（必ず current_user 経由）。
- リクエストテスト（登録→ログイン→目標保存→自分の情報取得、未ログインは401）を書いて通す。
- 動作確認用の curl（PowerShell では Invoke-RestMethod）の例を README か報告に載せる。
```

---

## フェーズ3 ― 記録 API

```
フェーズ3：記録のAPIを作ってください（ブランチ feature/records）。spec.md 8章の表のうち睡眠・ワーク・運動・運動タスク・食事。

- 睡眠／ワーク／運動：start（すでに計測中なら422）・finish（duration_minutes を計算して保存）・手動作成・一覧（from,to）・修正・削除。
  recorded_on は、睡眠＝起床した日、ワーク・運動＝開始した日（日本時間）。
- 運動タスク：今日の一覧と達成状況、チェックの付け外し（exercise_task_completions、1日1回）。
- 食事：CRUD。写真は has_one_attached :photo（multipart）、レスポンスに写真URL。食物繊維を含む5つの栄養値、meal_type、eaten_at、comment。
  app/services/meal_scanner.rb はインターフェースだけ（今は nil を返す）。
- 記録を保存・更新・削除したら、その日の daily_achievements を再計算する呼び出し口だけ用意（中身はフェーズ4）。
- リクエストテストを書いて通す。
```

---

## フェーズ4 ― スコア計算・日次確定・キャラ状態（いちばん大事）

```
フェーズ4：ゲームの中心ロジックを作ってください（ブランチ feature/game-logic）。仕様は spec.md 3章・4章がすべてです。

- app/services/score_calculator.rb：ある日・あるユーザーの4項目スコアと今日の総合達成度（%）を計算。
- app/services/daily_achievement_updater.rb：当日の daily_achievements を作成／更新（記録の保存時に呼ぶ）。characters のポイントは動かさない。
- app/services/daily_finalizer.rb：last_reset_on の翌日から昨日までを順に確定し、ポイントの増減・反映後ポイントを daily_achievements と characters に保存。finalized_at で二重反映を防止し、トランザクションで行う。記録がない日はスコア0。
- app/services/character_state_resolver.rb：spec.md 4.1 の優先順で状態を決め、変化したら character_state_logs に保存。4.2 の吹き出しメッセージも返す。
- GET /api/v1/home：最初に DailyFinalizer → 状態判定 → spec.md 8章の内容を返す。
- 通知（spec.md 7章）の作成もここで。同じ種類は1日1回まで。
- ユニットテスト必須：spec.md 3.3 の計算例がそのまま再現されること／目標0・タスク0件／ワーク200%／記録なしの日が3日続く／日付をまたぐ睡眠／2回呼んでも二重反映しない／状態判定の優先順。
  時刻は travel_to で固定してテストする。
```

---

## フェーズ5 ― フロントエンドの土台

```
フェーズ5：frontend/ に React の土台を作ってください（ブランチ feature/frontend-base）。

- frontend/ に Vite + React 19（JavaScript）を作成。npm create vite の対話が出る場合は非対話のオプションを使う。
- vite.config.js で /api と /characters を http://localhost:3000 に proxy。
- React Router でルーティング（spec.md 5章の画面すべて。未作成の画面は仮ページ）。未ログインならログインへ。
- API クライアント：devise_token_auth のヘッダー（access-token, client, uid）をレスポンスから保存し、次のリクエストに付ける。401 ならログインへ。
- 共通レイアウト：上部ヘッダー（右にメニュー≡、通知ベル＋未読数）、下部ナビ（ホーム／マイページ）、最大幅430pxで中央寄せ。色は docs/design の青（ヘッダー）と水色（背景）に合わせ、CSS変数にまとめる。
- ログイン・新規登録①〜④を、docs/design の screen_p08〜p12 に合わせて実装（④はデザインがないので③と同じ見た目で）。
- 起動手順（Rails と Vite を両方起動する方法）を README に追記。npm run build が通ることを確認。
```

---

## フェーズ6 ― ホームと記録画面

```
フェーズ6：ホームと記録画面を作ってください（ブランチ feature/home-records）。デザインは docs/design の screen_p01, p02, p06, p07, p13, p14, p18。

- ホーム：GET /api/v1/home を表示。キャラ画像は /characters/<state>.png（画面デザイン内のキャラ画像は使わない）。
  CSSアニメーション（通常はふわふわ、睡眠中はゆっくり、汗汗は小刻み）。背景は昼／夜（睡眠中）で切り替え（画像がなければグラデーションで代用）。
  気分バッジ、4項目＋総合のゲージ、吹き出し、記録ボタン6個（入浴・趣味は「準備中」表示）。睡眠中は「睡眠」ボタンが「起床」になる。
- 睡眠・ワーク：タイマー（ページを閉じても計測が続くよう、開始時刻はサーバーの started_at から計算）／手動入力の切替、前回データ、7日グラフ（Recharts）。
- 食事トップ・食事を記録：spec.md 5章のメモどおり（円グラフはカロリー）。写真はスマホのカメラ／ファイル選択。
- 運動：タスクのチェックリスト（未完了の警告）、移動距離の7日グラフ、運動タイマー。
- 記録したらホームに戻ったときにキャラの状態が変わっていることを確認する手順を書く。
```

---

## フェーズ7 ― 詳細・マイページ・フォロー・通知・設定

```
フェーズ7：残りの画面を作ってください（ブランチ feature/social-settings）。デザインは screen_p03, p04, p05, p15, p16, p17。

- 詳細：タブ（睡眠／食事／運動／ワーク）、合計値、スコアとポイントの推移グラフ（GET /api/v1/daily_achievements）。
- マイページ：アイコン・名前・フォロワー数／フォロー中数（タップでフォロー一覧）・記録グラフ。
- フォロー一覧：フォロワー／フォロー中タブ、ユーザー名検索、フォローする／外す。他人のマイページ（公開範囲は spec.md 5章）。
- 通知：一覧・既読。
- 設定：プロフィール変更（p.16）、目標変更（p.17、新規登録③④と同じ部品を使い回す）、ログアウト。
```

---

## フェーズ8 ― 仕上げ

```
フェーズ8：仕上げをしてください（ブランチ feature/polish）。

- 全画面を通しで操作し、壊れているところ・エラー表示がないところを直す。スマホ幅（375px）で崩れないか確認。
- README：環境構築（Windows）、.env の作り方、db:setup、両方のサーバーの起動、デモユーザーのログイン情報、テストの実行方法。
- docs/decisions.md を見直し、チームに確認が必要な項目を一覧で報告。
- bundle exec rails test と npm run build が通ることを確認。
```

---

## 困ったとき用の短い依頼文

- エラーが出た：`次のエラーが出ました。原因を説明してから直してください。直したら同じ操作で再確認してください。（エラー全文を貼る）`
- 仕様を変えた：`docs/spec.md の○章を書き換えました。差分を読んで、影響するコードとテストを直してください。先に変更計画を見せてください。`
- 作りすぎを止める：`今回は○○だけにしてください。それ以外のファイルは変更しないでください。`
