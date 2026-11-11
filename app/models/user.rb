# DBの users テーブルを扱う「ユーザーモデル」 #
# ただし、DBにどんな項目があり、文字列・整数などのどの型で保存するかは、基本的に db/migrate/ のファイルで定義
# frozen_string_literal: true

class User < ActiveRecord::Base
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable, :trackable and :omniauthable
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable
  include DeviseTokenAuth::Concerns::User

  has_one_attached :avatar

  enum :gender, { unspecified: 0, male: 1, female: 2, other: 3 }, validate: true
  enum :icon, { person_blue: 0, person_pink: 1, person_green: 2, cat: 3, penguin: 4, sprout: 5, person_yellow: 6 }, validate: true

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
  validate :avatar_must_be_an_image

  # 1ユーザー1匹。登録した日はポイントに反映しない（spec.md 3.2）ので last_reset_on = 登録日
  after_create :create_initial_character

  # 生年月日から年齢を出す（日本時間の今日で数える）。食事の目標値の初期値に使う
  def self.age_on(birthdate, on: Time.zone.today)
    years = on.year - birthdate.year
    birthday_passed = on.month * 100 + on.day >= birthdate.month * 100 + birthdate.day
    birthday_passed ? years : years - 1
  end

  def age(on: Time.zone.today)
    birthdate && self.class.age_on(birthdate, on: on)
  end

  # このユーザーにとっての日付（進化のポイント・継続日数・休んだ日の判定に使う）。
  # いまはアプリ全体の Time.zone（日本時間 0:00 区切り）。ユーザーごとのタイムゾーンを持つときはここだけ変える（docs/decisions.md）
  def local_date(time = Time.current)
    time.in_time_zone.to_date
  end

  def following?(other)
    active_follows.exists?(followed_id: other.id)
  end

  # お互いにフォローしているか（相手の記録の詳細を見られる条件。自分自身は false）
  def mutual_follow?(other)
    other.id != id && following?(other) && other.following?(self)
  end

  private

  # 登録した日は「休んだ日」の減少の対象外（decay_processed_through = 登録日）
  def create_initial_character
    create_character!(last_reset_on: Time.zone.today, decay_processed_through: local_date)
  end

  def birthdate_not_in_future
    return if birthdate.nil?

    errors.add(:birthdate, :in_future) if birthdate > Time.zone.today
  end

  def avatar_must_be_an_image
    return unless avatar.attached?

    errors.add(:avatar, "は画像ファイルを選択してください") unless avatar.blob.content_type.to_s.start_with?("image/")
    errors.add(:avatar, "は10MB以下にしてください") if avatar.blob.byte_size > 10.megabytes
  end
end
