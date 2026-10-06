# frozen_string_literal: true

class User < ActiveRecord::Base
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable, :trackable and :omniauthable
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable
  include DeviseTokenAuth::Concerns::User

  enum :gender, { unspecified: 0, male: 1, female: 2, other: 3 }, validate: true
  enum :icon, { person_blue: 0, person_pink: 1, person_green: 2, cat: 3, penguin: 4 }, validate: true

  has_one :character, dependent: :destroy
  has_one :goal, dependent: :destroy
  has_many :exercise_tasks, dependent: :destroy
  has_many :exercise_task_completions, through: :exercise_tasks
  has_many :sleep_records, dependent: :destroy
  has_many :work_records, dependent: :destroy
  has_many :exercise_records, dependent: :destroy
  has_many :meals, dependent: :destroy
  has_many :daily_achievements, dependent: :destroy

  has_many :active_follows, class_name: "Follow", foreign_key: :follower_id, dependent: :destroy, inverse_of: :follower
  has_many :followings, through: :active_follows, source: :followed
  has_many :passive_follows, class_name: "Follow", foreign_key: :followed_id, dependent: :destroy, inverse_of: :followed
  has_many :followers, through: :passive_follows, source: :follower

  has_many :notifications, dependent: :destroy
  has_many :sent_notifications, class_name: "Notification", foreign_key: :actor_id, dependent: :nullify, inverse_of: :actor

  validates :name, presence: true, length: { maximum: 50 }
  validates :birthdate, presence: true
  validate :birthdate_not_in_future

  # 年齢（日本時間の今日で数える）。食事の目標値の初期値に使う
  def age(on: Time.zone.today)
    return nil if birthdate.nil?

    years = on.year - birthdate.year
    birthday_passed = on.month * 100 + on.day >= birthdate.month * 100 + birthdate.day
    birthday_passed ? years : years - 1
  end

  def following?(other)
    active_follows.exists?(followed_id: other.id)
  end

  private

  def birthdate_not_in_future
    return if birthdate.nil?

    errors.add(:birthdate, :in_future) if birthdate > Time.zone.today
  end
end
