# frozen_string_literal: true

# devise_token_auth が内部で使う Devise の設定（最小限）。
# API モードなのでセッション・ナビゲーション関連は使わない。
Devise.setup do |config|
  require "devise/orm/active_record"

  # パスワード再設定メールは範囲外（spec.md 9章）だが、Devise の必須設定なので仮の送信元を置く
  config.mailer_sender = "no-reply@example.com"

  config.case_insensitive_keys = [ :email ]
  config.strip_whitespace_keys = [ :email ]
  config.skip_session_storage = [ :http_auth, :params_auth ]
  config.stretches = Rails.env.test? ? 1 : 12
  config.password_length = 6..128
  config.email_regexp = /\A[^@\s]+@[^@\s]+\z/
  config.reset_password_within = 6.hours
  config.navigational_formats = []
  config.sign_out_via = :delete
end
