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

      # 記録（spec.md 8章）。睡眠・ワークは手動での新規作成がないので create はない
      %i[sleep_records work_records].each do |records|
        resources records, only: %i[index update destroy] do
          collection do
            post :start
            post :finish
            post :cancel
          end
        end
      end
      resources :exercise_records, only: %i[index create destroy]
      resources :exercise_tasks, only: [] do
        get :today, on: :collection
        resource :completion, only: %i[create destroy], controller: "exercise_task_completions"
      end
      resources :meals

      # ホームと詳細画面のグラフ（フェーズ4）
      resource :home, only: :show
      resources :daily_achievements, only: :index

      # フォロー・通知（フェーズ7）
      resources :users, only: %i[index show] do
        member do
          get :followers
          get :followings
        end
        resource :follow, only: %i[create destroy]
        # 相互フォローの人の記録の詳細（読み取り専用）
        resource :records, only: :show, controller: "user_records"
      end
      resources :notifications, only: :index do
        patch :read, on: :member
        post :read_all, on: :collection
      end
    end
  end

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check
end
