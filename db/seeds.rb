# 何回流しても同じ状態になるように作る（マスタは find_or_initialize、デモユーザーは作り直し）
# 実行: ruby bin/rails db:seed

# ---------------------------------------------------------------
# キャラの画像（8状態）。画像本体は public/characters/<state>.png
# ---------------------------------------------------------------
{
  normal: "デフォルト",
  sleeping: "睡眠中",
  sleep_deprived: "睡眠不足",
  full: "満腹",
  hungry: "空腹",
  exercising: "汗汗（運動中）",
  studying: "勉強中",
  fat: "太り（運動不足）"
}.each do |state, description|
  animation = CharacterAnimation.find_or_initialize_by(state: state)
  animation.update!(gif_path: "/characters/#{state}.png", description: description)
end

# ---------------------------------------------------------------
# 栄養の基準: 日本人の食事摂取基準（2025年版）厚生労働省
# 18歳以上・身体活動レベル「ふつう」だけ入れる。
#   calories  … 「参考表 推定エネルギー必要量（kcal/日）」身体活動レベル ふつう
#   protein_g … 「たんぱく質の食事摂取基準」推奨量
#   fiber_g   … 「炭水化物の食事摂取基準」食物繊維の目標量（○○以上）の値
#   fat_g / carbs_g … 基準は %エネルギー（脂質 20〜30%、炭水化物 50〜65%）なので、
#     範囲の中央（25%・57.5%）から g に換算した値。脂質 9kcal/g、炭水化物 4kcal/g。
#     ※中央値で換算するのはこのアプリの仮決め（docs/decisions.md）
# 確認した資料: 堺市「1日に必要なエネルギー量の目安」（エネルギー）、
#   健康長寿ネット「食物繊維の働きと1日の摂取量」（食物繊維）、
#   FANCL「たんぱく質は1日にどれくらい必要？」（たんぱく質、厚労省の表を引用）
#   → 公式の報告書（策定検討会報告書）の表と最終確認すること【要確認】
# ---------------------------------------------------------------
FAT_ENERGY_RATIO = 0.25
CARBS_ENERGY_RATIO = 0.575

nutrition_rows = {
  # 性別 => [[年齢から, 年齢まで, エネルギー, たんぱく質, 食物繊維], ...]
  male: [
    [ 18, 29, 2600, 65, 20 ],
    [ 30, 49, 2750, 65, 22 ],
    [ 50, 64, 2650, 65, 22 ],
    [ 65, 74, 2350, 60, 21 ],
    [ 75, 120, 2250, 60, 20 ]
  ],
  female: [
    [ 18, 29, 1950, 50, 18 ],
    [ 30, 49, 2050, 50, 18 ],
    [ 50, 64, 1950, 50, 18 ],
    [ 65, 74, 1850, 50, 18 ],
    [ 75, 120, 1750, 50, 17 ]
  ]
}

nutrition_rows.each do |gender, rows|
  rows.each do |age_from, age_to, calories, protein_g, fiber_g|
    standard = NutritionStandard.find_or_initialize_by(gender: gender, age_from: age_from, activity_level: :moderate)
    standard.update!(
      age_to: age_to,
      calories: calories,
      protein_g: protein_g,
      fat_g: (calories * FAT_ENERGY_RATIO / 9).round(1),
      carbs_g: (calories * CARBS_ENERGY_RATIO / 4).round(1),
      fiber_g: fiber_g
    )
  end
end

# ---------------------------------------------------------------
# 動作確認用のデモユーザー2人（パスワードはどちらも password）
#   demo1@example.com たろう / demo2@example.com はなこ
# 昨日までの7日分の記録つき。お互いにフォローしている。
# 登録日は8日前にしてあるので、ホームを開くと7日分のポイントがまとめて確定する（フェーズ4）。
# ---------------------------------------------------------------
DEMO_PASSWORD = "password"
DEMO_DAYS = 7
today = Time.zone.today
rng = Random.new(2026) # 毎回同じ記録になるように固定

demo_users = [
  { email: "demo1@example.com", name: "たろう", icon: :cat, gender: :male, birthdate: Date.new(2004, 5, 10),
    goal: { sleep_goal_type: :duration, sleep_goal_minutes: 420, work_goal_minutes: 420 },
    tasks: [ "1キロ走る", "腕立て伏せ100回" ] },
  { email: "demo2@example.com", name: "はなこ", icon: :penguin, gender: :female, birthdate: Date.new(2005, 11, 3),
    goal: { sleep_goal_type: :time_range, bedtime: "00:00", wake_time: "07:00", work_goal_minutes: 360 },
    tasks: [ "ストレッチ10分", "スクワット30回" ] }
]

User.where(email: demo_users.pluck(:email)).destroy_all

users = demo_users.map do |attrs|
  user = User.create!(email: attrs[:email], password: DEMO_PASSWORD, password_confirmation: DEMO_PASSWORD,
                      name: attrs[:name], icon: attrs[:icon], gender: attrs[:gender], birthdate: attrs[:birthdate])
  user.character.update!(last_reset_on: today - (DEMO_DAYS + 1)) # キャラは User 作成時に自動で作られる

  standard = NutritionStandard.moderate.where(gender: attrs[:gender]).for_age(user.age).first
  user.create_goal!(attrs[:goal].merge(
    calorie_goal: standard.calories, protein_goal_g: standard.protein_g, fat_goal_g: standard.fat_g,
    carbs_goal_g: standard.carbs_g, fiber_goal_g: standard.fiber_g
  ))
  attrs[:tasks].each_with_index { |title, i| user.exercise_tasks.create!(title: title, position: i) }

  (1..DEMO_DAYS).each do |days_ago|
    day = today - days_ago
    # その日の hour 時 + min 分（min は 60 以上でもよい）
    at = ->(hour, min = 0) { Time.zone.local(day.year, day.month, day.day, hour) + min.minutes }

    # 睡眠: 前日の 23:00〜24:59 に寝て、当日 6:00〜7:59 に起きる（集計日＝起床した日）
    slept_at = at.call(23, rng.rand(0..119)) - 1.day
    user.sleep_records.create!(slept_at: slept_at, woke_at: at.call(6, rng.rand(0..119)))

    # ワーク: 9時台に開始して 3〜7 時間
    work_start = at.call(9, rng.rand(0..59))
    user.work_records.create!(title: "卒研の作業", started_at: work_start, ended_at: work_start + rng.rand(180..420).minutes)

    # 食事: 朝・昼・夕（たまに朝食を抜く）
    meals = [
      [ :breakfast, at.call(7, 30), "ご飯、味噌汁、卵焼き", 520, 18, 14, 80, 4 ],
      [ :lunch, at.call(12, 15), "パスタ、サラダ", 750, 25, 24, 105, 6 ],
      [ :dinner, at.call(19, 0), "ご飯、魚の塩焼き、野菜炒め", 820, 35, 22, 115, 7 ]
    ]
    meals.shift if rng.rand < 0.3
    meals.each do |meal_type, eaten_at, content, kcal, p, f, c, fiber|
      scale = rng.rand(0.8..1.2)
      user.meals.create!(meal_type: meal_type, eaten_at: eaten_at, content: content,
                         calories: (kcal * scale).round, protein_g: (p * scale).round(1), fat_g: (f * scale).round(1),
                         carbs_g: (c * scale).round(1), fiber_g: (fiber * scale).round(1))
    end

    # 運動タスク: ランダムに達成。移動距離はたまに記録
    user.exercise_tasks.each do |task|
      next if rng.rand < 0.4

      task.exercise_task_completions.create!(target_date: day, completed_at: at.call(18, rng.rand(0..59)))
    end
    if rng.rand < 0.6
      user.exercise_records.create!(started_at: at.call(18), distance_km: rng.rand(1.0..3.5).round(2), memo: "ジョギング")
    end
  end

  user
end

taro, hanako = users
Follow.create!(follower: taro, followed: hanako)
Follow.create!(follower: hanako, followed: taro)

puts "seed 完了: キャラ画像 #{CharacterAnimation.count} 件 / 栄養基準 #{NutritionStandard.count} 件 / " \
     "デモユーザー #{users.size} 人（#{demo_users.pluck(:email).join(', ')}、パスワード #{DEMO_PASSWORD}）"
