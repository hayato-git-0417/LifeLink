class ApplicationController < ActionController::API
  include DeviseTokenAuth::Concerns::SetUserByToken

  before_action :configure_permitted_parameters, if: :devise_controller?

  # API のエラーは { "errors": ["..."] } で返す（CLAUDE.md）
  rescue_from ActiveRecord::RecordNotFound do
    render_errors(I18n.t("api.errors.not_found"), status: :not_found)
  end

  rescue_from ActionController::ParameterMissing do |e|
    render_errors(I18n.t("api.errors.parameter_missing", param: e.param), status: :unprocessable_entity)
  end

  private

  def render_errors(messages, status: :unprocessable_entity)
    render json: { errors: Array(messages) }, status: status
  end

  # 新規登録（POST /api/v1/auth）でプロフィールも受け取る
  def configure_permitted_parameters
    devise_parameter_sanitizer.permit(:sign_up, keys: %i[name icon birthdate gender])
  end
end
