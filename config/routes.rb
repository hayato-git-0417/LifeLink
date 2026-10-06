Rails.application.routes.draw do
  # 認証（devise_token_auth）: /api/v1/auth, /api/v1/auth/sign_in, /api/v1/auth/sign_out, /api/v1/auth/validate_token
  # namespace ではなく scope にするのは、current_user などのヘルパー名を変えないため
  scope "api/v1" do
    mount_devise_token_auth_for "User", at: "auth", controllers: {
      registrations: "api/v1/auth/registrations"
    }
  end

  namespace :api, defaults: { format: :json } do
    namespace :v1 do
      get "registrations/email_available", to: "registrations#email_available"
      resource :me, only: %i[show update], controller: "me"
      resource :goal, only: %i[show update] do
        get :nutrition_defaults
      end
    end
  end

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check
end
