# frozen_string_literal: true

# devise_token_auth が内部で使う Devise の設定（最小限）。
# API モードなのでセッション・ナビゲーション関連は使わない。
Devise.setup do |config|
  require "devise/orm/active_record"

  # パスワード再設定メールは範囲外（spec.md 9章）だが、Devise の必須設定なので仮の送信元を置く
  config.mailer_sender = "no-reply@example.com"

  config.case_insensitive_keys = [ :email ] # メールアドレスの大文字・小文字を区別せず扱う
  config.strip_whitespace_keys = [ :email ] # メールアドレスの前後の空白を取り除く
  config.skip_session_storage = [ :http_auth, :params_auth ]  # 指定した認証方法では、ログインしたユーザーの情報を「セッション」に保存しない設定
  config.stretches = Rails.env.test? ? 1 : 12 # 自動テストでは計算を軽くして速く実行し、通常の開発・本番では12を使う(パスワードを大量に推測する攻撃も遅くできる)
  config.password_length = 8..128 # パスワードの最低・最大文字数
  config.email_regexp = /\A[^@\s]+@[^@\s]+\z/ # メールアドレスとして認める形式
  config.reset_password_within = 6.hours # パスワード再設定用トークンの有効時間
  config.navigational_formats = []  # Deviseがログイン画面へ転送する代わりに、401（認証が必要）などの応答を返す
  config.sign_out_via = :delete # ログアウトの要求をHTTPの DELETE という方法で送る設定
end
