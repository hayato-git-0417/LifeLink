class CharacterAnimation < ApplicationRecord
  enum :state, Character::STATES, validate: true

  validates :state, uniqueness: true
  validates :gif_path, presence: true, length: { maximum: 255 }
  validates :description, length: { maximum: 100 }
end
