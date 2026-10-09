# 通知（spec.md 7章）。自分の通知だけを current_user 経由で扱う
module Api
  module V1
    class NotificationsController < BaseController
      LIST_LIMIT = 50

      # GET /api/v1/notifications（新しい順に50件）
      def index
        notifications = current_user.notifications.includes(:actor).recent_first.limit(LIST_LIMIT)
        render json: {
          notifications: notifications.map { |notification| notification_json(notification) },
          unread_count: current_user.notifications.unread.count
        }
      end

      # PATCH /api/v1/notifications/:id/read
      def read
        notification = current_user.notifications.find(params[:id])
        notification.mark_as_read!
        render json: { notification: notification_json(notification), unread_count: current_user.notifications.unread.count }
      end

      # POST /api/v1/notifications/read_all
      def read_all
        current_user.notifications.unread.update_all(read_at: Time.current, updated_at: Time.current)
        render json: { unread_count: 0 }
      end

      private

      def notification_json(notification)
        actor = notification.actor
        {
          id: notification.id,
          notification_type: notification.notification_type,
          title: notification.title,
          body: notification.body,
          read: notification.read?,
          created_at: notification.created_at,
          actor: actor && { id: actor.id, name: actor.name, icon: actor.icon }
        }
      end
    end
  end
end
