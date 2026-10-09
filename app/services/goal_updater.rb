# 目標と運動タスクをまとめて保存する（PUT /api/v1/goal。新規登録④・目標変更）。
#   tasks: [{ id: 3, title: "1キロ走る" }, { title: "腕立て伏せ100回" }]（配列の順＝表示順）
#   - id あり → そのタスクの名前・順番を更新
#   - id なし → 新しく作る
#   - 今あるのに送られてこなかったタスク → 論理削除（active = false。過去の達成記録は残す）
#   - 名前が空の行は無視する（画面の空欄「項目2」など）
# 有効なタスクは1件以上必須【仮: spec.md 2章】。全部まとめて保存できたときだけ反映する。
class GoalUpdater
  Result = Struct.new(:goal, :errors) do
    def success? = errors.empty?
  end

  def self.call(...) = new(...).call

  def initialize(user:, goal_params:, tasks_params:)
    @user = user
    @goal_params = goal_params
    @tasks_params = Array(tasks_params)
  end

  def call
    goal = @user.goal || @user.build_goal
    goal.assign_attributes(@goal_params)
    task_rows = @tasks_params.map { |row| { id: row[:id].presence, title: row[:title].to_s.strip } }.reject { |row| row[:title].empty? }

    errors = []
    errors.concat(goal.errors.full_messages) unless goal.valid?(:setting)
    errors << I18n.t("activerecord.errors.messages.exercise_tasks_required") if task_rows.empty?
    return Result.new(goal, errors) if errors.any?

    ActiveRecord::Base.transaction do
      goal.save!(context: :setting)
      sync_tasks(task_rows)
    end
    Result.new(goal, [])
  rescue ActiveRecord::RecordInvalid => e
    Result.new(goal, e.record.errors.full_messages)
  rescue ActiveRecord::RecordNotFound
    Result.new(goal, [ I18n.t("activerecord.errors.messages.exercise_task_not_found") ])
  end

  private

  def sync_tasks(task_rows)
    active_tasks = @user.exercise_tasks.active
    kept_ids = []

    task_rows.each_with_index do |row, position|
      task = row[:id] ? active_tasks.find(row[:id]) : @user.exercise_tasks.build
      task.update!(title: row[:title], position: position)
      kept_ids << task.id
    end

    active_tasks.where.not(id: kept_ids).find_each(&:deactivate!)
  end
end
