# devise_token_auth の新規登録。エラーの形だけ { "errors": ["..."] } にそろえる。
# キャラの作成は User の after_create で行う（ユーザーとキャラは必ずセット）
module Api
  module V1
    module Auth
      class RegistrationsController < DeviseTokenAuth::RegistrationsController
        protected

        def render_create_error
          render json: { errors: @resource.errors.full_messages, field_errors: @resource.errors.to_hash(true) }, status: :unprocessable_entity
        end

        def render_update_error
          render json: { errors: @resource.errors.full_messages, field_errors: @resource.errors.to_hash(true) }, status: :unprocessable_entity
        end
      end
    end
  end
end
