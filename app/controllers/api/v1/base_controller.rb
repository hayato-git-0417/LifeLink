# ログインが必要な API の親。他人のデータは必ず current_user 経由で取る（CLAUDE.md）
module Api
  module V1
    class BaseController < ApplicationController
      before_action :authenticate_user!
    end
  end
end
