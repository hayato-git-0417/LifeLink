class Follow < ApplicationRecord
  belongs_to :follower, class_name: "User", inverse_of: :active_follows
  belongs_to :followed, class_name: "User", inverse_of: :passive_follows

  has_many :notifications, as: :notifiable, dependent: :nullify

  validates :followed_id, uniqueness: { scope: :follower_id }
  validate :not_self

  private

  def not_self
    errors.add(:base, :self_follow) if follower_id.present? && follower_id == followed_id
  end
end
