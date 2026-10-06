# CLAUDE.md — sotuken_b（生活リズム改善ゲーム）

このファイルは Claude Code が毎回読むプロジェクトの前提です。詳しい仕様は docs/ にあります。

## プロジェクト概要
- 目的: ユーザーの生活リズムを整える Web アプリ（卒業研究チーム開発）。
- 仕組み: ユーザーが理想の生活リズム（睡眠・食事・運動・ワーク）を登録 → キャラ1匹がその目標に沿って暮らし、ユーザーの記録に応じて状態が変わる（寝不足・空腹など）→ キャラに合わせて生活するうちにリズムが整う。
- 仕様書: `docs/spec.md`（最優先）／DB設計: `docs/db_design.md`／画面デザイン: `docs/design/*.png`／キャラ画像一覧: `docs/design/character_sheet.png`
- 段階ごとの依頼文: `docs/prompts.md`（人間が貼り付けて使う。フェーズ1〜8の区切りとして参照してよい）
- 仮決めの記録: `docs/decisions.md`

## 技術構成（チーム決定済み・勝手に変更しない）
| 項目 | バージョン |
|---|---|
| Ruby | 3.3.9（Windows / RubyInstaller） |
| Rails | 7.2.3.2（API モード）。**7.2.3.2 未満に下げない**（Active Storage の脆弱性修正版） |
| MySQL | 8.4.7（mysql2） |
| Node.js / npm | 22.19.0 / 10.9.3 |
| React | 19.2 系（Vite で `frontend/` に作成） |

- 1 リポジトリ構成: Rails（API）がルート、React は `frontend/`。
- Rails 7.2 系は 2026年8月でサポート終了済み。Rails のメジャー／マイナーを上げる提案はしてよいが、実行はしない。
- 認証: `devise_token_auth`（**1.2.6 以上**。1.2.5 以下は `rails < 7.2` 制約で入らない）。
- フロント: JavaScript（JSX）、React Router、グラフは Recharts、スタイルは CSS Modules。追加ライブラリは最小限にし、入れる前に理由を書く。
- 開発時は Vite の proxy で `/api`・`/characters`・`/rails/active_storage`（食事の写真）を `http://localhost:3000` に転送する（CORS 設定は不要にする）。

## すでに済んでいること（やり直さない）
- `rails _7.2.3.2_ new sotuken_b02 --api -d mysql` でプロジェクト作成（場所: `D:\g2\sotuken_b\sotuken_b02`。DB は `sotuken_b02_development` / `sotuken_b02_test`）
- 初回コミット済み（main）。`docs/`・`public/characters/`・`CLAUDE.md` もリポジトリに含めた
- `dotenv-rails` 導入。`config/database.yml` の default は `username: <%= ENV.fetch("DB_USERNAME") { "root" } %>` / `password: <%= ENV["DB_PASSWORD"] %>`
- `.env`（各自のパスワード・push しない）と `.env.example`（push する）を作成、`.gitignore` に `/.env`
- `rails db:create` 成功

## 開発環境の注意（Windows）
- シェルは PowerShell 想定。`bin/rails` は `ruby bin/rails ...` か `bundle exec rails ...` で実行する。
- PowerShell では `rails g` の引数に `{ }` を書くとエラーになる。型の細かい指定はマイグレーションファイルを直接編集する。
- `.env` の中身を表示・出力・コミットしない。秘密情報をコードに直書きしない。
- パスはスペースや日本語を含む可能性があるので必ずクォートする。

## 実装ルール
- 仕様は `docs/spec.md` → `docs/db_design.md` の順に優先。両者が食い違うときは spec.md に従い、差分を `docs/decisions.md` に追記する。
- 仕様にないこと・決まっていないことは、勝手に大きく作り込まない。**仮決めで進めるときは `docs/decisions.md` に「日付・内容・理由・要確認」を1行で残す**。
- スコア計算の定数（重み・基準スコア・倍率・初期ポイント・上下限・状態判定のしきい値）は `config/game.yml`（または `app/models/game_config.rb`）に集約し、コードに直書きしない。
- 業務ロジックは `app/services/` に置く（ScoreCalculator / DailyAchievementUpdater / DailyFinalizer / CharacterStateResolver など）。コントローラは薄く。
- API は `/api/v1/` 配下、JSON のキーは snake_case。エラーは `{ "errors": ["..."] }` 形式で 422/401/404 を返す。
- 時刻: DB は UTC、`config.time_zone = "Tokyo"`。日付の境界は日本時間 0:00。睡眠は起床した日の `recorded_on` に入れる。
- 他人のデータは必ず `current_user` 経由で取得する（`Model.find(params[:id])` を直接使わない）。
- 画面は 1 画面ずつ作り、各画面を作り終えたら動作確認手順を書く。

## テスト・確認
- Rails は標準の minitest。**スコア計算・日次確定・キャラ状態判定には必ずユニットテストを書く**（境界値: 目標0・記録なし・ワーク200%・日付またぎ）。
- 変更後は `bundle exec rails test` と、フロントは `npm run build`（`frontend/` で）が通ることを確認してから完了報告する。

## Git
- 作業ブランチを切ってから変更する。コミットは機能ごとに小さく、メッセージは日本語でよい。
- `push`・`force push`・`main` への直接コミットはしない（人間が行う）。
- `db/schema.rb` はマイグレーションと一緒にコミットする。

## 進め方
- 大きな作業の前に計画（変更するファイル・手順・確認方法）を短く示し、承認を待つ。
- 1 回の依頼で全部作らない。`docs/prompts.md` のフェーズ単位で進める。
- 完了報告には「やったこと／動作確認の手順／仮決めした点（decisions.md に書いたもの）」を必ず含める。
- 返答の都度、全体の何％終わったのかを表示する。
