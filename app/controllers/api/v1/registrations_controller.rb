# 新規登録時のユーザーID重複チェック（ログイン不要）
module Api
  module V1
    class RegistrationsController < ApplicationController
      # GET /api/v1/registrations/account_id_available?account_id=
      def account_id_available
        account_id = params.require(:account_id).to_s.strip

        unless account_id.match?(/\A[a-zA-Z0-9_.]{3,20}\z/)
          return render_errors(
            "ユーザーIDは半角英数字とアンダースコアで3〜20文字にしてください"
          )
        end

        available = !User.where(
          "LOWER(account_id) = ?",
          account_id.downcase
        ).exists?

        render json: {
          account_id: account_id,
          available: available
        }
      end
    end
  end
end
