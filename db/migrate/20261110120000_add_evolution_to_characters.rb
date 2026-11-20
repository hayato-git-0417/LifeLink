# キャラの進化（spec.md 4.3）。累計ポイント・段階・継続日数と、減少処理をどの日まで済ませたか
class AddEvolutionToCharacters < ActiveRecord::Migration[7.2]
  def change
    change_table :characters, bulk: true do |t|
      t.integer :evolution_points, null: false, default: 0
      t.integer :evolution_stage, null: false, default: 0
      t.integer :streak_days, null: false, default: 0
      t.date :last_recorded_on
      # 「休んだ日」の減少を済ませた最後の日（減少処理をした日の前日）。二重に減らさないために使う
      t.date :decay_processed_through
    end
  end
end
