# 新規登録①のメールアドレス重複チェック（ログイン不要）
module Api
  module V1
    class RegistrationsController < ApplicationController
      # GET /api/v1/registrations/email_available?email=
      def email_available
        email = params.require(:email).to_s.strip.downcase
        return render_errors("#{User.human_attribute_name(:email)}#{I18n.t('errors.messages.not_email')}") unless email.match?(Devise.email_regexp)

        render json: { email: email, available: !User.exists?(email: email) }
      end
    end
  end
end
