# キャラの状態から 睡眠不足(2)・満腹(3)・太り(7) をなくす（2026-11-24 ユーザー指示。docs/decisions.md）。
# enum の数字は残る状態のまま変えない（normal 0 / sleeping 1 / hungry 4 / exercising 5 / studying 6）。
# なくした状態の行は「デフォルト」にし、画像のマスタ（character_animations）の行は消す。
# 元の状態には戻せないので down は何もしない（スキーマは変わらない）
class RemoveUnusedCharacterStates < ActiveRecord::Migration[7.2]
  REMOVED = [ 2, 3, 7 ].freeze # sleep_deprived, full, fat

  def up
    execute "UPDATE characters SET state = 0 WHERE state IN (#{REMOVED.join(', ')})"
    execute "UPDATE character_state_logs SET state = 0 WHERE state IN (#{REMOVED.join(', ')})"
    execute "DELETE FROM character_animations WHERE state IN (#{REMOVED.join(', ')})"
  end

  def down
    # データだけの変更なので戻さない
  end
end
