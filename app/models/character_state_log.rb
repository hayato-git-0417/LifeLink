class CharacterStateLog < ApplicationRecord
  belongs_to :character

  enum :state, Character::STATES, validate: true

  validates :target_date, :started_at, presence: true
  validates :reason, length: { maximum: 255 }

  scope :current, -> { where(ended_at: nil) }
end
