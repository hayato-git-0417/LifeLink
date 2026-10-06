# DB設計書（sotuken_b）— Claude Code 用 Markdown 版

> 元ファイル: `sotuken_b_DB設計書.xlsx`（第1版たたき台, 2026-10-06）。この Markdown は Excel から機械的に変換したもの。数値を試算したいときは Excel の「達成度の計算」シートを使う。

## 設計の前提・ルール

- **命名**: テーブル名は英語の複数形・スネークケース（Railsの規約どおり）。外部キーは「参照先の単数形_id」
- **共通カラム**: 全テーブルに id（BIGINT・主キー・自動採番）、created_at / updated_at（DATETIME(6)）が付く。各定義シートの灰色の行
- **文字コード**: utf8mb4（Rails 7.2 で mysql2 を使うときの標準）。絵文字（🔥など）も保存できる
- **選択肢（enum）**: INT で保存し、モデルで enum を定義する。値の一覧は「enum定義」シート
- **日付の扱い**: 日をまたぐ記録（睡眠など）があるので、グラフ・1日リセット用に recorded_on（集計日）を持たせる
- **時刻**: DBにはUTCで保存し、config.time_zone = "Tokyo" で日本時間に変換して表示
- **画像**: 食事の写真は Active Storage（rails active_storage:install で作られる3テーブル）に保存
- **認証**: devise_token_auth を使う前提で users を設計（認証方式が変わる場合は users の認証カラムだけ差し替え）

## テーブル一覧

| No | 分類 | テーブル | モデル | 役割 | 関係する画面 |
|---|---|---|---|---|---|
| 1 | ユーザー・認証 | users | User | ログイン情報とプロフィール。devise_token_auth の生成カラムに、生年月日・性別・アイコンを追加する。 | ログイン(p.8) / 新規登録①②(p.9-10) / マイページ(p.3) / プロフィール変更(p.16) / 設定(p.15) |
| 2 | ユーザー・認証 | follows | Follow | ユーザー同士のフォロー関係。フォロワー数・フォロー中の数もここから数える。 | マイページ(p.3) / フォロー一覧(p.4) |
| 3 | ユーザー・認証 | notifications | Notification | 通知画面に出す内容。フォロー・キャラの状態変化・リマインドなど。 | 通知（デザイン未作成） / ホーム（未読バッジ） |
| 4 | キャラ | characters | Character | ユーザー1人につきキャラ1匹。現在の状態（8種類、毎日リセット）と、翌日に引き継ぐ各項目のポイント（0〜1000）を持つ。 | ホーム(p.1-2) |
| 5 | キャラ | character_state_logs | CharacterStateLog | キャラの状態がいつ・なぜ変わったかの履歴。通知や振り返りに使う。不要なら省略可。 | ホーム（内部処理） / 通知 |
| 6 | キャラ | daily_achievements | DailyAchievement | 1日ごとの記録。その日の達成スコア（0〜100）、そこから決まるポイントの増減、反映後のポイントを持つ。当日分は記録を保存するたびに計算し直し、日付が変わったときに確定してキャラのポイントへ反映する。 | ホーム(p.1-2)のゲージ / 詳細(p.5) / 各記録画面（保存時に再計算） |
| 7 | 目標設定 | goals | Goal | ユーザーの理想の生活リズム。キャラはこの値どおりに生活する。1ユーザー1行。 | 新規登録：目標設定(p.11-12) / 目標変更(p.17) / 食事トップ(p.13) |
| 8 | 目標設定 | exercise_tasks | ExerciseTask | 目標設定の「項目1・項目2…」。毎日チェックする運動タスクのひな形。 | 新規登録：目標設定(p.11-12) / 目標変更(p.17) / 運動(p.18) |
| 9 | 記録 | sleep_records | SleepRecord | 就寝〜起床の記録。ホームの「睡眠」で開始、「起床」で終了。手動入力も可。 | ホーム(p.1-2) / 睡眠(p.6) / 詳細(p.5) / マイページ(p.3) |
| 10 | 記録 | work_records | WorkRecord | 仕事・学習のタイマー記録。計測中はキャラが「勉強中」になる。 | ホーム(p.1-2)の仕事 / ワーク(p.7) / 詳細(p.5)の学習タブ |
| 11 | 記録 | exercise_task_completions | ExerciseTaskCompletion | 運動タスクのその日のチェック。行があれば達成。日付ごとに持つので毎日自然にリセットされる。 | 運動(p.18) / 詳細(p.5)の運動タブ |
| 12 | 記録 | exercise_records | ExerciseRecord | 運動した時間と移動距離。計測中はキャラが「汗汗」になる。 | ホーム(p.1-2)の運動 / 運動(p.18)の移動距離 / 詳細(p.5) |
| 13 | 記録 | meals | Meal | 1回の食事。写真は Active Storage（has_one_attached :photo）で保存し、このテーブルには列を持たない。 | ホーム(p.1-2) / 食事トップ(p.13) / 食事を記録(p.14) / 詳細(p.5) |
| 14 | マスタ | nutrition_standards | NutritionStandard | 年齢・性別ごとの食事のデフォルト値。新規登録時に goals の初期値を決めるのに使う。値は db/seeds.rb で投入。 | 新規登録（内部処理） / 食事トップ(p.13) |
| 15 | マスタ | character_animations | CharacterAnimation | キャラの状態（8種類）ごとに表示するGIFのパス。GIF本体は Rails の public/characters/ に置く（Reactを使う場合も使わない場合も同じパスで表示できる）。値は db/seeds.rb で投入。 | ホーム(p.1-2) |
| － | フレームワーク | active_storage_blobs<br>active_storage_attachments<br>active_storage_variant_records | （Rails標準） | 食事写真の保存用。rails active_storage:install で自動生成されるので自分で設計しない。 | 食事を記録(p.14) |

## リレーション（モデルに書く関連）

| 親 | 子 | 多重度 | 外部キー | 親削除時 | 親モデル | 子モデル |
|---|---|---|---|---|---|---|
| users | characters | 1 : 1 | characters.user_id | 親と一緒に削除 | has_one :character, dependent: :destroy | belongs_to :user |
| users | goals | 1 : 1 | goals.user_id | 親と一緒に削除 | has_one :goal, dependent: :destroy | belongs_to :user |
| users | exercise_tasks | 1 : 多 | exercise_tasks.user_id | 親と一緒に削除 | has_many :exercise_tasks, dependent: :destroy | belongs_to :user |
| users | sleep_records | 1 : 多 | sleep_records.user_id | 親と一緒に削除 | has_many :sleep_records, dependent: :destroy | belongs_to :user |
| users | work_records | 1 : 多 | work_records.user_id | 親と一緒に削除 | has_many :work_records, dependent: :destroy | belongs_to :user |
| users | exercise_records | 1 : 多 | exercise_records.user_id | 親と一緒に削除 | has_many :exercise_records, dependent: :destroy | belongs_to :user |
| users | meals | 1 : 多 | meals.user_id | 親と一緒に削除 | has_many :meals, dependent: :destroy | belongs_to :user |
| users | follows（フォローする側） | 1 : 多 | follows.follower_id | 親と一緒に削除 | has_many :active_follows, class_name: "Follow", foreign_key: :follower_id, dependent: :destroy<br>has_many :followings, through: :active_follows, source: :followed | belongs_to :follower, class_name: "User" |
| users | follows（フォローされる側） | 1 : 多 | follows.followed_id | 親と一緒に削除 | has_many :passive_follows, class_name: "Follow", foreign_key: :followed_id, dependent: :destroy<br>has_many :followers, through: :passive_follows, source: :follower | belongs_to :followed, class_name: "User" |
| users | notifications（受信） | 1 : 多 | notifications.user_id | 親と一緒に削除 | has_many :notifications, dependent: :destroy | belongs_to :user |
| users | notifications（発生元） | 1 : 多 | notifications.actor_id | NULLにする | has_many :sent_notifications, class_name: "Notification", foreign_key: :actor_id, dependent: :nullify | belongs_to :actor, class_name: "User", optional: true |
| users | daily_achievements | 1 : 多 | daily_achievements.user_id | 親と一緒に削除 | has_many :daily_achievements, dependent: :destroy | belongs_to :user |
| characters | character_animations | 多 : 1（値で対応） | 外部キーなし（state の値で探す） | － | def animation<br>  CharacterAnimation.find_by(state: state)<br>end | － |
| characters | character_state_logs | 1 : 多 | character_state_logs.character_id | 親と一緒に削除 | has_many :character_state_logs, dependent: :destroy | belongs_to :character |
| exercise_tasks | exercise_task_completions | 1 : 多 | exercise_task_completions.exercise_task_id | 親と一緒に削除 | has_many :exercise_task_completions, dependent: :destroy | belongs_to :exercise_task |
| meals | 写真（Active Storage） | 1 : 0..1 | active_storage_attachments.record_id | 親と一緒に削除 | has_one_attached :photo | － |
| （任意のデータ） | notifications | 多 : 1 | notifications.notifiable_type / notifiable_id | － | has_many :notifications, as: :notifiable | belongs_to :notifiable, polymorphic: true, optional: true |

## テーブル定義

全テーブルに `id`(BIGINT PK) / `created_at` / `updated_at` が付く（以下では省略）。

### users

- 役割: ログイン情報とプロフィール。devise_token_auth の生成カラムに、生年月日・性別・アイコンを追加する。
- 画面: ログイン(p.8) / 新規登録①②(p.9-10) / マイページ(p.3) / プロフィール変更(p.16) / 設定(p.15)
- モデル: User（app/models/user.rb）

| 物理名 | 論理名 | MySQL型 | Rails型 | NOT NULL | 初期値 | キー | 参照先 | 例 | 備考 |
|---|---|---|---|---|---|---|---|---|---|
| `provider` | 認証プロバイダ | VARCHAR(255) | string | ○ | email |  |  | email | devise_token_auth 生成 |
| `uid` | 認証UID | VARCHAR(255) | string | ○ | ''（空文字） |  |  | taro@example.com | devise_token_auth 生成。通常はメールアドレスと同じ値 |
| `encrypted_password` | 暗号化パスワード | VARCHAR(255) | string | ○ | ''（空文字） |  |  | $2a$12$... | devise 生成。平文は保存しない |
| `reset_password_token` | パスワード再設定トークン | VARCHAR(255) | string |  |  | UQ |  |  | devise 生成 |
| `reset_password_sent_at` | 再設定メール送信日時 | DATETIME(6) | datetime |  |  |  |  |  | devise 生成 |
| `allow_password_change` | パスワード変更許可 | TINYINT(1) | boolean |  | false |  |  | false | devise_token_auth 生成 |
| `remember_created_at` | ログイン保持開始日時 | DATETIME(6) | datetime |  |  |  |  |  | devise 生成 |
| `email` | メールアドレス | VARCHAR(255) | string | ○ |  | UQ |  | taro@example.com | 新規登録① / ログイン |
| `name` | ユーザー名 | VARCHAR(50) | string (limit: 50) | ○ |  |  |  | たろう | 新規登録② / プロフィール変更。フォロー検索の対象 |
| `icon` | アイコン | INT | integer | ○ | 0 |  |  | 3（ねこ） | enum。新規登録②の5種類から選択 |
| `birthdate` | 生年月日 | DATE | date | ○ |  |  |  | 2006-10-13 | 新規登録②。年齢を計算して食事の目標値に使う |
| `gender` | 性別 | INT | integer | ○ | 0 |  |  | 1（男性） | enum。食事のデフォルト値に使う。※画面に入力欄なし→要確認 |
| `tokens` | 認証トークン | JSON | json |  |  |  |  |  | devise_token_auth 生成。ログイン中の端末ごとのトークン |

インデックス: ユニーク: `email`（同じメールアドレスで二重登録しない） / ユニーク: `uid, provider`（重複登録を防ぐ） / ユニーク: `reset_password_token`（重複登録を防ぐ） / 通常: `name`（フォロー一覧のユーザー検索）

### follows

- 役割: ユーザー同士のフォロー関係。フォロワー数・フォロー中の数もここから数える。
- 画面: マイページ(p.3) / フォロー一覧(p.4)
- モデル: Follow（app/models/follow.rb）

| 物理名 | 論理名 | MySQL型 | Rails型 | NOT NULL | 初期値 | キー | 参照先 | 例 | 備考 |
|---|---|---|---|---|---|---|---|---|---|
| `follower_id` | フォローする人 | BIGINT | references | ○ |  | FK | users.id | 1 | users.id |
| `followed_id` | フォローされる人 | BIGINT | references | ○ |  | FK | users.id | 2 | users.id。自分自身はモデルのバリデーションで禁止 |

インデックス: 通常: `followed_id`（外部キー（t.references が自動で作る）） / ユニーク: `follower_id, followed_id`（同じ人を二重にフォローしない）

### notifications

- 役割: 通知画面に出す内容。フォロー・キャラの状態変化・リマインドなど。
- 画面: 通知（デザイン未作成） / ホーム（未読バッジ）
- モデル: Notification（app/models/notification.rb）

| 物理名 | 論理名 | MySQL型 | Rails型 | NOT NULL | 初期値 | キー | 参照先 | 例 | 備考 |
|---|---|---|---|---|---|---|---|---|---|
| `user_id` | 受信ユーザー | BIGINT | references | ○ |  | FK | users.id | 1 | 通知を受け取る人 |
| `actor_id` | 発生させたユーザー | BIGINT | references |  |  | FK | users.id | 2 | フォローした人など。システム通知はNULL |
| `notification_type` | 通知種別 | INT | integer | ○ | 0 |  |  | 1（キャラ） | enum |
| `title` | タイトル | VARCHAR(100) | string (limit: 100) | ○ |  |  |  | ねむそうにしています |  |
| `body` | 本文 | VARCHAR(255) | string |  |  |  |  | 昨日の睡眠が目標より1時間短いよ |  |
| `notifiable_type` | 関連データの種類 | VARCHAR(255) | string |  |  |  |  | SleepRecord | ポリモーフィック関連。例：Follow, SleepRecord |
| `notifiable_id` | 関連データのID | BIGINT | bigint |  |  |  |  | 15 | ポリモーフィック関連 |
| `read_at` | 既読日時 | DATETIME(6) | datetime |  |  |  |  |  | NULL＝未読 |

インデックス: 通常: `actor_id`（外部キー（t.references が自動で作る）） / 通常: `notifiable_type, notifiable_id`（ポリモーフィック関連の検索（t.references が自動で作る）） / 通常: `user_id, read_at`（未読件数の取得） / 通常: `user_id, created_at`（一覧・集計の検索を速くする）

### characters

- 役割: ユーザー1人につきキャラ1匹。現在の状態（8種類、毎日リセット）と、翌日に引き継ぐ各項目のポイント（0〜1000）を持つ。
- 画面: ホーム(p.1-2)
- モデル: Character（app/models/character.rb）

| 物理名 | 論理名 | MySQL型 | Rails型 | NOT NULL | 初期値 | キー | 参照先 | 例 | 備考 |
|---|---|---|---|---|---|---|---|---|---|
| `user_id` | ユーザー | BIGINT | references | ○ |  | FK / UQ | users.id | 1 | 1ユーザー1匹（UNIQUE） |
| `name` | キャラ名 | VARCHAR(30) | string (limit: 30) |  |  |  |  | ねこまる | ※画面に入力欄なし→要確認 |
| `state` | 現在の状態 | INT | integer | ○ | 0 |  |  | 1（睡眠中） | enum（8状態）。表示するGIFは character_animations から引く |
| `sleep_points` | 睡眠ポイント | INT | integer | ○ | 500 |  |  | 620 | 0〜1000。前日までの増減を反映した現在値。初期値は要確認 |
| `meal_points` | 食事ポイント | INT | integer | ○ | 500 |  |  | 540 | 同上 |
| `exercise_points` | 運動ポイント | INT | integer | ○ | 500 |  |  | 410 | 同上 |
| `work_points` | ワークポイント | INT | integer | ○ | 500 |  |  | 580 | 同上 |
| `total_points` | 総合ポイント | INT | integer | ○ | 500 |  |  | 546 | 0〜1000。睡眠×0.30＋食事×0.30＋運動×0.20＋ワーク×0.20（四捨五入） |
| `state_changed_at` | 状態変更日時 | DATETIME(6) | datetime |  |  |  |  | 2026-10-05 23:45 |  |
| `last_reset_on` | 最終リセット日 | DATE | date |  |  |  |  | 2026-10-05 | 状態のリセットとポイント反映を済ませた最後の日付 |

インデックス: ユニーク: `user_id`（1ユーザーにつき1行に制限）

### character_state_logs

- 役割: キャラの状態がいつ・なぜ変わったかの履歴。通知や振り返りに使う。不要なら省略可。
- 画面: ホーム（内部処理） / 通知
- モデル: CharacterStateLog（app/models/character_state_log.rb）

| 物理名 | 論理名 | MySQL型 | Rails型 | NOT NULL | 初期値 | キー | 参照先 | 例 | 備考 |
|---|---|---|---|---|---|---|---|---|---|
| `character_id` | キャラクター | BIGINT | references | ○ |  | FK | characters.id | 1 |  |
| `state` | 状態 | INT | integer | ○ |  |  |  | 2（睡眠不足） | enum（characters.state と同じ） |
| `reason` | 変化の理由 | VARCHAR(255) | string |  |  |  |  | 睡眠が目標より90分短い | 判定理由のメモ |
| `target_date` | 対象日 | DATE | date | ○ |  |  |  | 2026-10-05 |  |
| `started_at` | 開始日時 | DATETIME(6) | datetime | ○ |  |  |  | 2026-10-05 07:10 |  |
| `ended_at` | 終了日時 | DATETIME(6) | datetime |  |  |  |  |  | NULL＝現在の状態 |

インデックス: 通常: `character_id, started_at`（一覧・集計の検索を速くする） / 通常: `character_id, target_date`（日ごとの集計・グラフ表示を速くする）

### daily_achievements

- 役割: 1日ごとの記録。その日の達成スコア（0〜100）、そこから決まるポイントの増減、反映後のポイントを持つ。当日分は記録を保存するたびに計算し直し、日付が変わったときに確定してキャラのポイントへ反映する。
- 画面: ホーム(p.1-2)のゲージ / 詳細(p.5) / 各記録画面（保存時に再計算）
- モデル: DailyAchievement（app/models/daily_achievement.rb）

| 物理名 | 論理名 | MySQL型 | Rails型 | NOT NULL | 初期値 | キー | 参照先 | 例 | 備考 |
|---|---|---|---|---|---|---|---|---|---|
| `user_id` | ユーザー | BIGINT | references | ○ |  | FK | users.id | 1 |  |
| `target_date` | 対象日 | DATE | date | ○ |  |  |  | 2026-10-05 | 各記録の recorded_on と同じ日付 |
| `sleep_score` | 睡眠スコア | DECIMAL(5,1) | decimal (precision: 5, scale: 1) | ○ | 0 |  |  | 92.9 | 0〜100。min(実際の睡眠時間 ÷ 目標睡眠時間 × 100, 100) |
| `meal_score` | 食事スコア | DECIMAL(5,1) | decimal (precision: 5, scale: 1) | ○ | 0 |  |  | 81.0 | 0〜100。5つの栄養素の点数の平均 |
| `exercise_score` | 運動スコア | DECIMAL(5,1) | decimal (precision: 5, scale: 1) | ○ | 0 |  |  | 50.0 | 0〜100。達成したタスク数 ÷ 全タスク数 × 100 |
| `work_score` | ワークスコア | DECIMAL(5,1) | decimal (precision: 5, scale: 1) | ○ | 0 |  |  | 71.4 | 実際のワーク時間 ÷ 目標ワーク時間 × 100 |
| `sleep_change` | 睡眠ポイント増減 | INT | integer | ○ | 0 |  |  | 86 | プラス＝加算、マイナス＝減算。換算方法は要確認 |
| `meal_change` | 食事ポイント増減 | INT | integer | ○ | 0 |  |  | 62 | 同上 |
| `exercise_change` | 運動ポイント増減 | INT | integer | ○ | 0 |  |  | 0 | 同上 |
| `work_change` | ワークポイント増減 | INT | integer | ○ | 0 |  |  | 43 | 同上 |
| `sleep_points` | 睡眠ポイント（反映後） | INT | integer | ○ | 0 |  |  | 706 | 0〜1000。前日のポイント＋増減 |
| `meal_points` | 食事ポイント（反映後） | INT | integer | ○ | 0 |  |  | 602 | 同上 |
| `exercise_points` | 運動ポイント（反映後） | INT | integer | ○ | 0 |  |  | 410 | 同上 |
| `work_points` | ワークポイント（反映後） | INT | integer | ○ | 0 |  |  | 623 | 同上 |
| `total_points` | 総合ポイント（反映後） | INT | integer | ○ | 0 |  |  | 599 | 0〜1000。4項目のポイントの重み付き合計 |
| `recorded_items_count` | 記録した項目数 | INT | integer | ○ | 0 |  |  | 4 | 0〜4。その日に記録があった項目の数 |
| `finalized_at` | 確定日時 | DATETIME(6) | datetime |  |  |  |  | 2026-10-06 07:02 | NULL＝当日でまだ変わる。日付が変わってキャラのポイントへ反映した時刻 |

インデックス: ユニーク: `user_id, target_date`（同じ日に二重登録しない（1日1回のチェック））

### goals

- 役割: ユーザーの理想の生活リズム。キャラはこの値どおりに生活する。1ユーザー1行。
- 画面: 新規登録：目標設定(p.11-12) / 目標変更(p.17) / 食事トップ(p.13)
- モデル: Goal（app/models/goal.rb）

| 物理名 | 論理名 | MySQL型 | Rails型 | NOT NULL | 初期値 | キー | 参照先 | 例 | 備考 |
|---|---|---|---|---|---|---|---|---|---|
| `user_id` | ユーザー | BIGINT | references | ○ |  | FK / UQ | users.id | 1 | 1ユーザー1行（UNIQUE） |
| `sleep_goal_type` | 睡眠目標の指定方法 | INT | integer | ○ | 0 |  |  | 0（時間） | enum。p.11＝時間 / p.12＝時間帯 |
| `sleep_goal_minutes` | 目標睡眠時間（分） | INT | integer |  |  |  |  | 420（7時間） | 「時間」指定のとき使う |
| `bedtime` | 目標就寝時刻 | TIME | time |  |  |  |  | 00:00 | 「時間帯」指定のとき使う |
| `wake_time` | 目標起床時刻 | TIME | time |  |  |  |  | 07:00 | 「時間帯」指定のとき使う |
| `work_goal_minutes` | 目標ワーク時間（分） | INT | integer |  |  |  |  | 420（7時間） | 画面の「学習時間」 |
| `calorie_goal` | 目標摂取カロリー（kcal） | INT | integer |  |  |  |  | 2200 | 初期値は nutrition_standards から年齢・性別で設定 |
| `protein_goal_g` | 目標たんぱく質（g） | DECIMAL(5,1) | decimal (precision: 5, scale: 1) |  |  |  |  | 60.0 | 同上 |
| `fat_goal_g` | 目標脂質（g） | DECIMAL(5,1) | decimal (precision: 5, scale: 1) |  |  |  |  | 60.0 | 同上 |
| `carbs_goal_g` | 目標炭水化物（g） | DECIMAL(5,1) | decimal (precision: 5, scale: 1) |  |  |  |  | 300.0 | 同上 |
| `fiber_goal_g` | 目標食物繊維（g） | DECIMAL(5,1) | decimal (precision: 5, scale: 1) |  |  |  |  | 21.0 | 同上。食事達成度の5項目めに使う |
| `breakfast_time` | 朝食の時刻 | TIME | time |  |  |  |  | 07:30 | キャラが空腹になるタイミング。※画面に入力欄なし→要確認 |
| `lunch_time` | 昼食の時刻 | TIME | time |  |  |  |  | 12:00 | 同上 |
| `dinner_time` | 夕食の時刻 | TIME | time |  |  |  |  | 19:00 | 同上 |

インデックス: ユニーク: `user_id`（1ユーザーにつき1行に制限）

### exercise_tasks

- 役割: 目標設定の「項目1・項目2…」。毎日チェックする運動タスクのひな形。
- 画面: 新規登録：目標設定(p.11-12) / 目標変更(p.17) / 運動(p.18)
- モデル: ExerciseTask（app/models/exercise_task.rb）

| 物理名 | 論理名 | MySQL型 | Rails型 | NOT NULL | 初期値 | キー | 参照先 | 例 | 備考 |
|---|---|---|---|---|---|---|---|---|---|
| `user_id` | ユーザー | BIGINT | references | ○ |  | FK | users.id | 1 |  |
| `title` | タスク名 | VARCHAR(100) | string (limit: 100) | ○ |  |  |  | 1キロ走る |  |
| `position` | 表示順 | INT | integer | ○ | 0 |  |  | 1 |  |
| `active` | 有効フラグ | TINYINT(1) | boolean | ○ | true |  |  | true | 削除時は false にして過去の達成記録を残す |

インデックス: 通常: `user_id, position`（一覧・集計の検索を速くする）

### sleep_records

- 役割: 就寝〜起床の記録。ホームの「睡眠」で開始、「起床」で終了。手動入力も可。
- 画面: ホーム(p.1-2) / 睡眠(p.6) / 詳細(p.5) / マイページ(p.3)
- モデル: SleepRecord（app/models/sleep_record.rb）

| 物理名 | 論理名 | MySQL型 | Rails型 | NOT NULL | 初期値 | キー | 参照先 | 例 | 備考 |
|---|---|---|---|---|---|---|---|---|---|
| `user_id` | ユーザー | BIGINT | references | ○ |  | FK | users.id | 1 |  |
| `slept_at` | 就寝日時 | DATETIME(6) | datetime | ○ |  |  |  | 2026-10-04 23:45 |  |
| `woke_at` | 起床日時 | DATETIME(6) | datetime |  |  |  |  | 2026-10-05 06:15 | NULL＝睡眠中（キャラも睡眠中にする） |
| `duration_minutes` | 睡眠時間（分） | INT | integer |  |  |  |  | 390 | 起床時に計算して保存 |
| `quality` | 睡眠の質（%） | INT | integer |  |  |  |  | 80 | 0〜100。※算出方法は要確認 |
| `record_method` | 記録方法 | INT | integer | ○ | 0 |  |  | 0（タイマー） | enum（タイマー／手動） |
| `recorded_on` | 集計日 | DATE | date | ○ |  |  |  | 2026-10-05 | 起床した日の日付。日付をまたぐのでグラフ集計はこれで行う |

インデックス: 通常: `user_id, recorded_on`（日ごとの集計・グラフ表示を速くする） / 通常: `user_id, slept_at`（一覧・集計の検索を速くする）

### work_records

- 役割: 仕事・学習のタイマー記録。計測中はキャラが「勉強中」になる。
- 画面: ホーム(p.1-2)の仕事 / ワーク(p.7) / 詳細(p.5)の学習タブ
- モデル: WorkRecord（app/models/work_record.rb）

| 物理名 | 論理名 | MySQL型 | Rails型 | NOT NULL | 初期値 | キー | 参照先 | 例 | 備考 |
|---|---|---|---|---|---|---|---|---|---|
| `user_id` | ユーザー | BIGINT | references | ○ |  | FK | users.id | 1 |  |
| `title` | 内容 | VARCHAR(100) | string (limit: 100) |  |  |  |  | 卒研の資料作成 | 任意 |
| `started_at` | 開始日時 | DATETIME(6) | datetime | ○ |  |  |  | 2026-10-05 09:00 |  |
| `ended_at` | 終了日時 | DATETIME(6) | datetime |  |  |  |  | 2026-10-05 11:30 | NULL＝計測中 |
| `duration_minutes` | 作業時間（分） | INT | integer |  |  |  |  | 150 | 終了時に計算して保存 |
| `record_method` | 記録方法 | INT | integer | ○ | 0 |  |  | 0（タイマー） | enum（タイマー／手動） |
| `recorded_on` | 集計日 | DATE | date | ○ |  |  |  | 2026-10-05 |  |

インデックス: 通常: `user_id, recorded_on`（日ごとの集計・グラフ表示を速くする）

### exercise_task_completions

- 役割: 運動タスクのその日のチェック。行があれば達成。日付ごとに持つので毎日自然にリセットされる。
- 画面: 運動(p.18) / 詳細(p.5)の運動タブ
- モデル: ExerciseTaskCompletion（app/models/exercise_task_completion.rb）

| 物理名 | 論理名 | MySQL型 | Rails型 | NOT NULL | 初期値 | キー | 参照先 | 例 | 備考 |
|---|---|---|---|---|---|---|---|---|---|
| `exercise_task_id` | 運動タスク | BIGINT | references | ○ |  | FK | exercise_tasks.id | 3 |  |
| `target_date` | 対象日 | DATE | date | ○ |  |  |  | 2026-10-05 |  |
| `completed_at` | 達成日時 | DATETIME(6) | datetime | ○ |  |  |  | 2026-10-05 18:20 |  |

インデックス: ユニーク: `exercise_task_id, target_date`（同じ日に二重登録しない（1日1回のチェック））

### exercise_records

- 役割: 運動した時間と移動距離。計測中はキャラが「汗汗」になる。
- 画面: ホーム(p.1-2)の運動 / 運動(p.18)の移動距離 / 詳細(p.5)
- モデル: ExerciseRecord（app/models/exercise_record.rb）

| 物理名 | 論理名 | MySQL型 | Rails型 | NOT NULL | 初期値 | キー | 参照先 | 例 | 備考 |
|---|---|---|---|---|---|---|---|---|---|
| `user_id` | ユーザー | BIGINT | references | ○ |  | FK | users.id | 1 |  |
| `started_at` | 開始日時 | DATETIME(6) | datetime | ○ |  |  |  | 2026-10-05 18:00 |  |
| `ended_at` | 終了日時 | DATETIME(6) | datetime |  |  |  |  | 2026-10-05 18:30 | NULL＝運動中 |
| `duration_minutes` | 運動時間（分） | INT | integer |  |  |  |  | 30 |  |
| `distance_km` | 移動距離（km） | DECIMAL(5,2) | decimal (precision: 5, scale: 2) |  |  |  |  | 2.50 | グラフは日ごとに合計 |
| `record_method` | 記録方法 | INT | integer | ○ | 0 |  |  | 1（手動） | enum（タイマー／手動） |
| `memo` | メモ | VARCHAR(255) | string |  |  |  |  | ジョギング |  |
| `recorded_on` | 集計日 | DATE | date | ○ |  |  |  | 2026-10-05 |  |

インデックス: 通常: `user_id, recorded_on`（日ごとの集計・グラフ表示を速くする）

### meals

- 役割: 1回の食事。写真は Active Storage（has_one_attached :photo）で保存し、このテーブルには列を持たない。
- 画面: ホーム(p.1-2) / 食事トップ(p.13) / 食事を記録(p.14) / 詳細(p.5)
- モデル: Meal（app/models/meal.rb）

| 物理名 | 論理名 | MySQL型 | Rails型 | NOT NULL | 初期値 | キー | 参照先 | 例 | 備考 |
|---|---|---|---|---|---|---|---|---|---|
| `user_id` | ユーザー | BIGINT | references | ○ |  | FK | users.id | 1 |  |
| `meal_type` | 食事区分 | INT | integer | ○ | 0 |  |  | 2（夕食） | enum（朝食・昼食・夕食・間食） |
| `eaten_at` | 食べた日時 | DATETIME(6) | datetime | ○ |  |  |  | 2026-10-05 19:10 | 記録画面の「時間」 |
| `content` | 内容 | VARCHAR(255) | string |  |  |  |  | サラダ、ご飯、魚の塩焼き | 記録画面の「内容」。料理名を「、」区切りで保存 |
| `calories` | カロリー合計（kcal） | INT | integer |  |  |  |  | 650 | スキャン結果または手入力 |
| `protein_g` | たんぱく質合計（g） | DECIMAL(6,1) | decimal (precision: 6, scale: 1) |  |  |  |  | 32.5 |  |
| `fat_g` | 脂質合計（g） | DECIMAL(6,1) | decimal (precision: 6, scale: 1) |  |  |  |  | 18.0 |  |
| `carbs_g` | 炭水化物合計（g） | DECIMAL(6,1) | decimal (precision: 6, scale: 1) |  |  |  |  | 85.0 |  |
| `fiber_g` | 食物繊維合計（g） | DECIMAL(6,1) | decimal (precision: 6, scale: 1) |  |  |  |  | 6.5 | 食事達成度の5項目め。※記録画面に欄なし→要確認 |
| `comment` | コメント | TEXT | text |  |  |  |  | 少し食べすぎた |  |
| `input_method` | 入力方法 | INT | integer | ○ | 0 |  |  | 0（スキャン） | enum（スキャン／手入力） |
| `recorded_on` | 集計日 | DATE | date | ○ |  |  |  | 2026-10-05 |  |

インデックス: 通常: `user_id, recorded_on`（日ごとの集計・グラフ表示を速くする） / 通常: `user_id, eaten_at`（一覧・集計の検索を速くする）

### nutrition_standards

- 役割: 年齢・性別ごとの食事のデフォルト値。新規登録時に goals の初期値を決めるのに使う。値は db/seeds.rb で投入。
- 画面: 新規登録（内部処理） / 食事トップ(p.13)
- モデル: NutritionStandard（app/models/nutrition_standard.rb）

| 物理名 | 論理名 | MySQL型 | Rails型 | NOT NULL | 初期値 | キー | 参照先 | 例 | 備考 |
|---|---|---|---|---|---|---|---|---|---|
| `gender` | 性別 | INT | integer | ○ |  |  |  | 1 | enum（1男性／2女性） |
| `age_from` | 年齢（から） | INT | integer | ○ |  |  |  | 18 |  |
| `age_to` | 年齢（まで） | INT | integer | ○ |  |  |  | 29 |  |
| `activity_level` | 身体活動レベル | INT | integer | ○ | 2 |  |  | 2（ふつう） | enum。まずは「ふつう」だけ使えばよい |
| `calories` | 推定エネルギー必要量（kcal/日） | INT | integer | ○ |  |  |  |  | 出典：日本人の食事摂取基準（2025年版） |
| `protein_g` | たんぱく質（g/日） | DECIMAL(5,1) | decimal (precision: 5, scale: 1) |  |  |  |  |  |  |
| `fat_g` | 脂質（g/日） | DECIMAL(5,1) | decimal (precision: 5, scale: 1) |  |  |  |  |  | エネルギー比から計算して入れる |
| `carbs_g` | 炭水化物（g/日） | DECIMAL(5,1) | decimal (precision: 5, scale: 1) |  |  |  |  |  | 同上 |
| `fiber_g` | 食物繊維（g/日） | DECIMAL(5,1) | decimal (precision: 5, scale: 1) |  |  |  |  |  | 食事摂取基準の目標量 |

インデックス: ユニーク: `gender, age_from, activity_level`（重複登録を防ぐ）

### character_animations

- 役割: キャラの状態（8種類）ごとに表示するGIFのパス。GIF本体は Rails の public/characters/ に置く（Reactを使う場合も使わない場合も同じパスで表示できる）。値は db/seeds.rb で投入。
- 画面: ホーム(p.1-2)
- モデル: CharacterAnimation（app/models/character_animation.rb）

| 物理名 | 論理名 | MySQL型 | Rails型 | NOT NULL | 初期値 | キー | 参照先 | 例 | 備考 |
|---|---|---|---|---|---|---|---|---|---|
| `state` | 状態 | INT | integer | ○ |  | UQ |  | 1（睡眠中） | enum（characters.state と同じ）。1状態に1行 |
| `gif_path` | GIFのパス | VARCHAR(255) | string | ○ |  |  |  | /characters/sleeping.gif | Rails の public/ から見たパス |
| `description` | 説明 | VARCHAR(100) | string (limit: 100) |  |  |  |  | ふとんで眠っている | 任意 |

インデックス: ユニーク: `state`（重複登録を防ぐ）

## enum 定義（INT で保存）

- `テーブル.カラム`: `モデルに書くコード`
- `users.gender`: `enum :gender, { unspecified: 0, male: 1, female: 2, other: 3 }`
- `users.icon`: `enum :icon, { person_blue: 0, person_pink: 1, person_green: 2, cat: 3, penguin: 4 }`
- `characters.state`: `enum :state, { normal: 0, sleeping: 1, sleep_deprived: 2, full: 3, hungry: 4, exercising: 5, studying: 6, fat: 7 }`
- `character_state_logs.state`: `enum :state, { normal: 0, sleeping: 1, sleep_deprived: 2, full: 3, hungry: 4, exercising: 5, studying: 6, fat: 7 }`
- `character_animations.state`: `enum :state, { normal: 0, sleeping: 1, sleep_deprived: 2, full: 3, hungry: 4, exercising: 5, studying: 6, fat: 7 }`
- `goals.sleep_goal_type`: `enum :sleep_goal_type, { duration: 0, time_range: 1 }`
- `sleep_records.record_method`: `enum :record_method, { timer: 0, manual: 1 }`
- `work_records.record_method`: `enum :record_method, { timer: 0, manual: 1 }`
- `exercise_records.record_method`: `enum :record_method, { timer: 0, manual: 1 }`
- `meals.meal_type`: `enum :meal_type, { breakfast: 0, lunch: 1, dinner: 2, snack: 3 }`
- `meals.input_method`: `enum :input_method, { scan: 0, manual: 1 }`
- `nutrition_standards.gender`: `enum :gender, { male: 1, female: 2, other: 3 }`
- `nutrition_standards.activity_level`: `enum :activity_level, { low: 1, moderate: 2, high: 3 }`
- `notifications.notification_type`: `enum :notification_type, { follow: 0, character: 1, reminder: 2, task: 3 }`

表示名: characters.state = normal:デフォルト / sleeping:睡眠中 / sleep_deprived:睡眠不足 / full:満腹 / hungry:空腹 / exercising:汗汗（運動中） / studying:勉強中 / fat:太り（運動不足）

## 画面 CRUD 表

| 画面 | 資料 | users | follows | notifications | characters | character_state_logs | daily_achievements | goals | exercise_tasks | sleep_records | work_records | exercise_task_completions | exercise_records | meals | nutrition_standards | character_animations |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ログイン | p.8 | R |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| 新規登録① メール・パスワード | p.9 | C |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| 新規登録② アイコン・名前・生年月日 | p.10 | U |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| 新規登録 目標設定 | p.11-12 |  |  |  | C |  |  | C | C |  |  |  |  |  | R |  |
| ホーム（通常／睡眠中） | p.1-2 |  |  | CR | RU | C | CRU | R |  | CU | R |  | R | R |  | R |
| マイページ | p.3 | R | R |  |  |  |  |  |  | R |  |  |  |  |  |  |
| フォロー一覧 | p.4 | R | CRD | C |  |  |  |  |  |  |  |  |  |  |  |  |
| 詳細（睡眠・食事・運動・学習） | p.5 |  |  |  |  |  | R | R |  | R | R | R | R | R |  |  |
| 睡眠 | p.6 |  |  |  |  |  | CU |  |  | CRU |  |  |  |  |  |  |
| ワーク | p.7 |  |  |  |  |  | CU |  |  |  | CRU |  |  |  |  |  |
| 食事トップ | p.13 |  |  |  |  |  |  | R |  |  |  |  |  | R |  |  |
| 食事を記録 | p.14 |  |  |  |  |  | CU |  |  |  |  |  |  | C |  |  |
| 運動 | p.18 |  |  |  |  |  | CU |  | R |  |  | CD | CR |  |  |  |
| 設定（ログアウト） | p.15 | U |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| プロフィール変更 | p.16 | RU |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| 目標変更 | p.17 |  |  |  |  |  |  | RU | CRU |  |  |  |  |  |  |  |
| 通知（デザイン未作成） | － |  |  | RU |  |  |  |  |  |  |  |  |  |  |  |  |

## 要確認事項（DB設計時点の仮決め）

| No | 区分 | 内容 | 仮決め | 関係テーブル | 状態 |
|---|---|---|---|---|---|
| 1 | 画面 | 性別の入力欄が画面にない。食事のデフォルト値（年齢・性別）に必要 | users.gender を用意し、初期値は0（未回答）。新規登録②に性別を追加するのがおすすめ | users, nutrition_standards | 未確認 |
| 2 | 画面 | フォロー検索が「ユーザーネームまたは表示名」となっているが、名前の入力欄は1つだけ | name（ユーザー名）1つで検索。重複しないIDが必要になったら users に username（UNIQUE）を追加 | users | 未確認 |
| 3 | 画面 | 食事の時刻（朝・昼・夕）を入力する欄がない。キャラの空腹判定に必要 | goals に breakfast_time / lunch_time / dinner_time を用意。目標設定画面に欄を追加 | goals | 未確認 |
| 4 | 将来 | 自由設定（入浴・趣味など）は今回の範囲から削除。後で入れる可能性あり | 入れるときは custom_activities（項目名・分類・予定時刻・目標時間・表示順）と custom_activity_records（開始・終了・時間・記録方法・集計日）の2テーブルを追加する。既存テーブルの変更は不要 | （追加時）custom_activities, custom_activity_records | 保留 |
| 5 | 画面 | 新規登録の③（4段階のうち）の内容が未定 | 現状の画面（①メール→②プロフィール→目標設定）で設計 | － | 未確認 |
| 6 | 仕様 | 睡眠の質（80%など）の出し方が未定 | quality（0〜100の整数）だけ用意。起床時の自己評価にするのが一番簡単 | sleep_records | 未確認 |
| 7 | 仕様 | 「1日」の区切り（0時か、朝4時などか） | 集計は recorded_on（日付）で行う。睡眠は起床した日を入れる | 各記録テーブル | 未確認 |
| 8 | 仕様 | キャラの状態を判定するタイミング（記録時／アクセス時／定期実行） | 記録の保存時とホーム表示時に判定し、characters.state と当日の daily_achievements を更新。日付が変わったら last_reset_on を見て状態をリセットし、前日分のポイントを確定してキャラへ反映 | characters, character_state_logs, daily_achievements | 未確認 |
| 9 | 仕様 | その日のスコア（0〜100）をポイントの増減に換える方法 | 仮案：増減 ＝（スコア − 50）× 2。100点で＋100、50点で±0、記録なし（0点）で−100。ポイントは0〜1000の範囲に収める（「達成度の計算」シートで値を変えて試せる） | characters, daily_achievements | 未確認 |
| 10 | 仕様 | ポイントの初期値（新規登録したとき） | 仮：各項目500（真ん中）。0から始めると、最初の数日は減らせないため | characters | 未確認 |
| 11 | 仕様 | 総合ポイントの出し方 | 仮：4項目のポイントを 睡眠×0.30＋食事×0.30＋運動×0.20＋ワーク×0.20 で合算（最大1000）。総合だけ別に増減させる方法もある | characters, daily_achievements | 未確認 |
| 12 | 仕様 | アプリを開かなかった日のポイント反映 | 日付が変わって最初にアクセスしたとき、last_reset_on の翌日から昨日までを順に確定させる（記録のない日はスコア0）。定期実行の仕組みは不要 | characters, daily_achievements | 未確認 |
| 13 | 仕様 | 「太り」になる条件 | 仮：運動ポイントが300未満の日は、その日の基本の状態を「太り」にする。状態は毎日リセットし、睡眠中など他の状態と重なることはない | characters | 未確認 |
| 14 | 仕様 | ワークスコアに上限がない（目標の2倍働くと200になる） | ポイント換算の前に100で頭打ちにする（換算式の min(スコア,100)）。ワークスコア自体は指定どおりの式で保存 | daily_achievements | 未確認 |
| 15 | 技術 | GIF画像の置き場所 | Rails の public/characters/ に置き、character_animations.gif_path にパスを保存。Reactを使う場合も使わない場合も同じテーブル・同じGIFで表示できる | character_animations | 未確認 |
| 16 | 技術 | Reactを導入できなかった場合の画面 | 今のRailsはAPIモードで、画面（HTML）を返す仕組みを持たない。その場合はコントローラを ActionController::Base にしてビュー（ERB）を追加する必要がある。DB設計は変わらない | － | 未確認 |
| 17 | 仕様 | 目標値が0・未設定、運動タスクが0件のとき（0で割ってしまう） | 仮：目標設定で各目標値と運動タスク1件以上を必須にする。それでも0のときは達成度0% | goals, exercise_tasks | 未確認 |
| 18 | 仕様 | 睡眠目標を「時間帯」で決めたときの目標睡眠時間 | 仮：起床時刻 − 就寝時刻（日付をまたぐときは24時間を足す）。判定は睡眠の長さだけで、就寝時刻のずれは見ない | goals | 未確認 |
| 19 | 画面 | 食物繊維の入力欄・目標の欄がない（食事達成度の5項目めに必要） | meals.fiber_g / goals.fiber_goal_g / nutrition_standards.fiber_g を追加。ミールスキャンで取れない場合の扱いを決める | meals, goals, nutrition_standards | 未確認 |
| 20 | 仕様 | 目標を変更したとき、過去の日の判定に古い目標を使うか | goals は最新値だけ持つ（シンプル優先）。必要になったら履歴テーブルを追加 | goals | 未確認 |
| 21 | 仕様 | ミールスキャン（写真から料理・カロリーを出す）の方法 | 結果（料理名・カロリー・PFC）は meals に保存。写真は Active Storage。解析APIは別途決める | meals | 未確認 |
| 22 | 技術 | 認証方式（devise_token_auth で確定か） | devise_token_auth 前提で users を設計。メール確認（confirmable）は使わない想定 | users | 未確認 |
| 23 | 技術 | タイムゾーン | config.time_zone = "Tokyo"、DBにはUTCで保存（Railsの標準） | 全テーブル | 未確認 |
| 24 | マスタ | 栄養基準の数値 | nutrition_standards の値は「日本人の食事摂取基準（2025年版）」（厚生労働省）から seeds.rb で投入する | nutrition_standards | 未確認 |

## マイグレーション（作成順）

PowerShell では `rails g` の引数に `{ }` を書くとエラーになるので、型の細かい指定はマイグレーションファイル側で行う。

- **（事前準備）**: `bundle add devise_token_auth<br>rails active_storage:install` — Gemfile に devise_token_auth を入れ、Active Storage のテーブルも作っておく。<br>users は devise_token_auth のジェネレータが作るマイグレーションを、右のコードに合わせて書き換える（nickname・image・メール確認用カラムは使わないので消してよい）。<br>PowerShell では rails g の引数に { } を書くとエラーになるので、型の細かい指定はマイグレーションファイル側で行う。

### 1. users（`rails g devise_token_auth:install User auth`）

```ruby
class CreateUsers < ActiveRecord::Migration[7.2]
  def change
    create_table :users do |t|
      t.string :provider, null: false, default: "email"
      t.string :uid, null: false, default: ""
      t.string :encrypted_password, null: false, default: ""
      t.string :reset_password_token
      t.datetime :reset_password_sent_at
      t.boolean :allow_password_change, default: false
      t.datetime :remember_created_at
      t.string :email, null: false
      t.string :name, limit: 50, null: false
      t.integer :icon, null: false, default: 0
      t.date :birthdate, null: false
      t.integer :gender, null: false, default: 0
      t.json :tokens
      t.timestamps
      t.index :email, unique: true
      t.index [:uid, :provider], unique: true
      t.index :reset_password_token, unique: true
      t.index :name
    end
  end
end
```

### 2. follows（`rails g model Follow`）

```ruby
class CreateFollows < ActiveRecord::Migration[7.2]
  def change
    create_table :follows do |t|
      t.references :follower, null: false, foreign_key: { to_table: :users }, index: false # 複合indexで代用
      t.references :followed, null: false, foreign_key: { to_table: :users }
      t.timestamps
      t.index [:follower_id, :followed_id], unique: true
    end
  end
end
```

### 3. notifications（`rails g model Notification`）

```ruby
class CreateNotifications < ActiveRecord::Migration[7.2]
  def change
    create_table :notifications do |t|
      t.references :user, null: false, foreign_key: true, index: false # 複合indexで代用
      t.references :actor, foreign_key: { to_table: :users }
      t.integer :notification_type, null: false, default: 0
      t.string :title, limit: 100, null: false
      t.string :body
      t.references :notifiable, polymorphic: true
      t.datetime :read_at
      t.timestamps
      t.index [:user_id, :read_at]
      t.index [:user_id, :created_at]
    end
  end
end
```

### 4. characters（`rails g model Character`）

```ruby
class CreateCharacters < ActiveRecord::Migration[7.2]
  def change
    create_table :characters do |t|
      t.references :user, null: false, foreign_key: true, index: { unique: true }
      t.string :name, limit: 30
      t.integer :state, null: false, default: 0
      t.integer :sleep_points, null: false, default: 500
      t.integer :meal_points, null: false, default: 500
      t.integer :exercise_points, null: false, default: 500
      t.integer :work_points, null: false, default: 500
      t.integer :total_points, null: false, default: 500
      t.datetime :state_changed_at
      t.date :last_reset_on
      t.timestamps
    end
  end
end
```

### 5. character_state_logs（`rails g model CharacterStateLog`）

```ruby
class CreateCharacterStateLogs < ActiveRecord::Migration[7.2]
  def change
    create_table :character_state_logs do |t|
      t.references :character, null: false, foreign_key: true, index: false # 複合indexで代用
      t.integer :state, null: false
      t.string :reason
      t.date :target_date, null: false
      t.datetime :started_at, null: false
      t.datetime :ended_at
      t.timestamps
      t.index [:character_id, :started_at]
      t.index [:character_id, :target_date]
    end
  end
end
```

### 6. daily_achievements（`rails g model DailyAchievement`）

```ruby
class CreateDailyAchievements < ActiveRecord::Migration[7.2]
  def change
    create_table :daily_achievements do |t|
      t.references :user, null: false, foreign_key: true, index: false # 複合indexで代用
      t.date :target_date, null: false
      t.decimal :sleep_score, precision: 5, scale: 1, null: false, default: 0
      t.decimal :meal_score, precision: 5, scale: 1, null: false, default: 0
      t.decimal :exercise_score, precision: 5, scale: 1, null: false, default: 0
      t.decimal :work_score, precision: 5, scale: 1, null: false, default: 0
      t.integer :sleep_change, null: false, default: 0
      t.integer :meal_change, null: false, default: 0
      t.integer :exercise_change, null: false, default: 0
      t.integer :work_change, null: false, default: 0
      t.integer :sleep_points, null: false, default: 0
      t.integer :meal_points, null: false, default: 0
      t.integer :exercise_points, null: false, default: 0
      t.integer :work_points, null: false, default: 0
      t.integer :total_points, null: false, default: 0
      t.integer :recorded_items_count, null: false, default: 0
      t.datetime :finalized_at
      t.timestamps
      t.index [:user_id, :target_date], unique: true
    end
  end
end
```

### 7. goals（`rails g model Goal`）

```ruby
class CreateGoals < ActiveRecord::Migration[7.2]
  def change
    create_table :goals do |t|
      t.references :user, null: false, foreign_key: true, index: { unique: true }
      t.integer :sleep_goal_type, null: false, default: 0
      t.integer :sleep_goal_minutes
      t.time :bedtime
      t.time :wake_time
      t.integer :work_goal_minutes
      t.integer :calorie_goal
      t.decimal :protein_goal_g, precision: 5, scale: 1
      t.decimal :fat_goal_g, precision: 5, scale: 1
      t.decimal :carbs_goal_g, precision: 5, scale: 1
      t.decimal :fiber_goal_g, precision: 5, scale: 1
      t.time :breakfast_time
      t.time :lunch_time
      t.time :dinner_time
      t.timestamps
    end
  end
end
```

### 8. exercise_tasks（`rails g model ExerciseTask`）

```ruby
class CreateExerciseTasks < ActiveRecord::Migration[7.2]
  def change
    create_table :exercise_tasks do |t|
      t.references :user, null: false, foreign_key: true, index: false # 複合indexで代用
      t.string :title, limit: 100, null: false
      t.integer :position, null: false, default: 0
      t.boolean :active, null: false, default: true
      t.timestamps
      t.index [:user_id, :position]
    end
  end
end
```

### 9. sleep_records（`rails g model SleepRecord`）

```ruby
class CreateSleepRecords < ActiveRecord::Migration[7.2]
  def change
    create_table :sleep_records do |t|
      t.references :user, null: false, foreign_key: true, index: false # 複合indexで代用
      t.datetime :slept_at, null: false
      t.datetime :woke_at
      t.integer :duration_minutes
      t.integer :quality
      t.integer :record_method, null: false, default: 0
      t.date :recorded_on, null: false
      t.timestamps
      t.index [:user_id, :recorded_on]
      t.index [:user_id, :slept_at]
    end
  end
end
```

### 10. work_records（`rails g model WorkRecord`）

```ruby
class CreateWorkRecords < ActiveRecord::Migration[7.2]
  def change
    create_table :work_records do |t|
      t.references :user, null: false, foreign_key: true, index: false # 複合indexで代用
      t.string :title, limit: 100
      t.datetime :started_at, null: false
      t.datetime :ended_at
      t.integer :duration_minutes
      t.integer :record_method, null: false, default: 0
      t.date :recorded_on, null: false
      t.timestamps
      t.index [:user_id, :recorded_on]
    end
  end
end
```

### 11. exercise_task_completions（`rails g model ExerciseTaskCompletion`）

```ruby
class CreateExerciseTaskCompletions < ActiveRecord::Migration[7.2]
  def change
    create_table :exercise_task_completions do |t|
      t.references :exercise_task, null: false, foreign_key: true, index: false # 複合indexで代用
      t.date :target_date, null: false
      t.datetime :completed_at, null: false
      t.timestamps
      t.index [:exercise_task_id, :target_date], unique: true
    end
  end
end
```

### 12. exercise_records（`rails g model ExerciseRecord`）

```ruby
class CreateExerciseRecords < ActiveRecord::Migration[7.2]
  def change
    create_table :exercise_records do |t|
      t.references :user, null: false, foreign_key: true, index: false # 複合indexで代用
      t.datetime :started_at, null: false
      t.datetime :ended_at
      t.integer :duration_minutes
      t.decimal :distance_km, precision: 5, scale: 2
      t.integer :record_method, null: false, default: 0
      t.string :memo
      t.date :recorded_on, null: false
      t.timestamps
      t.index [:user_id, :recorded_on]
    end
  end
end
```

### 13. meals（`rails g model Meal`）

```ruby
class CreateMeals < ActiveRecord::Migration[7.2]
  def change
    create_table :meals do |t|
      t.references :user, null: false, foreign_key: true, index: false # 複合indexで代用
      t.integer :meal_type, null: false, default: 0
      t.datetime :eaten_at, null: false
      t.string :content
      t.integer :calories
      t.decimal :protein_g, precision: 6, scale: 1
      t.decimal :fat_g, precision: 6, scale: 1
      t.decimal :carbs_g, precision: 6, scale: 1
      t.decimal :fiber_g, precision: 6, scale: 1
      t.text :comment
      t.integer :input_method, null: false, default: 0
      t.date :recorded_on, null: false
      t.timestamps
      t.index [:user_id, :recorded_on]
      t.index [:user_id, :eaten_at]
    end
  end
end
```

### 14. nutrition_standards（`rails g model NutritionStandard`）

```ruby
class CreateNutritionStandards < ActiveRecord::Migration[7.2]
  def change
    create_table :nutrition_standards do |t|
      t.integer :gender, null: false
      t.integer :age_from, null: false
      t.integer :age_to, null: false
      t.integer :activity_level, null: false, default: 2
      t.integer :calories, null: false
      t.decimal :protein_g, precision: 5, scale: 1
      t.decimal :fat_g, precision: 5, scale: 1
      t.decimal :carbs_g, precision: 5, scale: 1
      t.decimal :fiber_g, precision: 5, scale: 1
      t.timestamps
      t.index [:gender, :age_from, :activity_level], unique: true
    end
  end
end
```

### 15. character_animations（`rails g model CharacterAnimation`）

```ruby
class CreateCharacterAnimations < ActiveRecord::Migration[7.2]
  def change
    create_table :character_animations do |t|
      t.integer :state, null: false
      t.string :gif_path, null: false
      t.string :description, limit: 100
      t.timestamps
      t.index :state, unique: true
    end
  end
end
```
- **（実行）**: `rails db:migrate` — db/schema.rb が更新されるので、それも一緒に push する。
