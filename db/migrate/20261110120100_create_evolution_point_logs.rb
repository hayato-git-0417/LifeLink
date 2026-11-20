# 累計ポイントの増減履歴（spec.md 4.3）。
# 記録による加算は「キャラ・日・項目」で1行だけ（一意の索引で二重加算を防ぐ）。減少の行は item が NULL
class CreateEvolutionPointLogs < ActiveRecord::Migration[7.2]
  def change
    create_table :evolution_point_logs do |t|
      t.references :character, null: false, foreign_key: true, index: false
      t.integer :reason, null: false # recorded（記録）/ missed（休んだ日）
      t.integer :item # sleep / meal / exercise / work（recorded のときだけ）
      t.date :target_date, null: false # recorded = 記録した日、missed = 減少処理をした日
      t.integer :amount, null: false # 実際に動いたポイント（下限で止まったときは止まった分）
      t.integer :points_after, null: false
      t.integer :stage_after, null: false
      t.integer :multiplier_tenths # recorded のときの倍率（10 分の 1 単位）
      t.integer :missed_days # missed のときの休んだ日数
      t.timestamps
    end
    add_index :evolution_point_logs, %i[character_id target_date item], unique: true
    add_index :evolution_point_logs, %i[character_id created_at]
  end
end
