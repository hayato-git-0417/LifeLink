# DBの users テーブルを扱う「ユーザーモデル」 #
# ただし、DBにどんな項目があり、文字列・整数などのどの型で保存するかは、基本的に db/migrate/ のファイルで定義
# frozen_string_literal: true

class User < ActiveRecord::Base
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable, :trackable and :omniauthable
  # # config/initializers/devise.rbにパスワード設定がある
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable
  include DeviseTokenAuth::Concerns::User

  # 値の対応付け #
  enum :gender, { unspecified: 0, male: 1, female: 2, other: 3 }, validate: true
  enum :icon, { person_blue: 0, person_pink: 1, person_green: 2, cat: 3, penguin: 4 }, validate: true

  # アソシエーション #
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

  # 入力チェック #
  validates :name, presence: true, length: { maximum: 50 }
  validates :birthdate, presence: true
  validate :birthdate_not_in_future
  validate :password_contains_letters_and_numbers # 入力内容をチェックするときに、このメソッドを実行してください」とRailsに登録する

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

  def following?(other)
    active_follows.exists?(followed_id: other.id)
  end

  # お互いにフォローしているか（相手の記録の詳細を見られる条件。自分自身は false）
  def mutual_follow?(other)
    other.id != id && following?(other) && other.following?(self)
  end

  private

  def create_initial_character
    create_character!(last_reset_on: Time.zone.today)
  end

  def birthdate_not_in_future
    return if birthdate.nil?

    errors.add(:birthdate, :in_future) if birthdate > Time.zone.today
  end

  # パスワードに英数字を含む条件本体
  def password_contains_letters_and_numbers
    return if password.blank?

    has_letter = password.match?(/[a-zA-Z]/)
    has_number = password.match?(/[0-9]/)

    unless has_letter && has_number
      errors.add(:password, "は英字と数字をそれぞれ1文字以上含めてください")
    end
  end
end
