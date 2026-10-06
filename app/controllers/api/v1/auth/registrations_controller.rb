# devise_token_auth の新規登録。エラーの形だけ { "errors": ["..."] } にそろえる。
# キャラの作成は User の after_create で行う（ユーザーとキャラは必ずセット）
module Api
  module V1
    module Auth
      class RegistrationsController < DeviseTokenAuth::RegistrationsController
        protected

        def render_create_error
          render_errors(@resource.errors.full_messages)
        end

        def render_update_error
          render_errors(@resource.errors.full_messages)
        end
      end
    end
  end
end
