class Notification < ApplicationRecord
  belongs_to :user
  belongs_to :actor, class_name: "User", optional: true, inverse_of: :sent_notifications
  belongs_to :notifiable, polymorphic: true, optional: true

  enum :notification_type, { follow: 0, character: 1, reminder: 2, task: 3 }, validate: true

  validates :title, presence: true, length: { maximum: 100 }
  validates :body, length: { maximum: 255 }

  scope :unread, -> { where(read_at: nil) }
  scope :recent_first, -> { order(created_at: :desc, id: :desc) }

  def read?
    read_at.present?
  end

  def mark_as_read!
    update!(read_at: Time.current) unless read?
  end
end
