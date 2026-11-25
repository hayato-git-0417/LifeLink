# ユーザーIDでログインし、DeviseTokenAuth には内部メールを渡す。
module Api
  module V1
    module Auth
      class SessionsController < DeviseTokenAuth::SessionsController
        before_action :resolve_account_id, only: :create

        private

        def resolve_account_id
          account_id = params[:account_id].to_s.strip
          # 以前のクライアントからのメールログインは互換性のため受け付ける。
          return if account_id.empty? && params[:email].present?

          user = User.where("LOWER(account_id) = ?", account_id.downcase).first
          # 見つからないIDも通常の認証失敗として扱う。
          params[:email] = user&.email || ""
        end
      end
    end
  end
end
