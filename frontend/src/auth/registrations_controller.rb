# ユーザーIDで登録する。DeviseTokenAuth用の内部メールアドレスは自動生成する。
module Api
  module V1
    module Auth
      class RegistrationsController < DeviseTokenAuth::RegistrationsController
        def create
          params[:email] = "account-#{SecureRandom.hex(16)}@lifelink.invalid"
          super
        end

        protected

        def render_create_error
          render json: {
            errors: @resource.errors.full_messages,
            field_errors: @resource.errors.to_hash(true)
          }, status: :unprocessable_entity
        end

        def render_update_error
          render json: {
            errors: @resource.errors.full_messages,
            field_errors: @resource.errors.to_hash(true)
          }, status: :unprocessable_entity
        end
      end
    end
  end
end
