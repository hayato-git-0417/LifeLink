# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[7.2].define(version: 2026_10_06_144845) do
  create_table "active_storage_attachments", charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.string "name", null: false
    t.string "record_type", null: false
    t.bigint "record_id", null: false
    t.bigint "blob_id", null: false
    t.datetime "created_at", null: false
    t.index ["blob_id"], name: "index_active_storage_attachments_on_blob_id"
    t.index ["record_type", "record_id", "name", "blob_id"], name: "index_active_storage_attachments_uniqueness", unique: true
  end

  create_table "active_storage_blobs", charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.string "key", null: false
    t.string "filename", null: false
    t.string "content_type"
    t.text "metadata"
    t.string "service_name", null: false
    t.bigint "byte_size", null: false
    t.string "checksum"
    t.datetime "created_at", null: false
    t.index ["key"], name: "index_active_storage_blobs_on_key", unique: true
  end

  create_table "active_storage_variant_records", charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.string "variation_digest", null: false
    t.index ["blob_id", "variation_digest"], name: "index_active_storage_variant_records_uniqueness", unique: true
  end

  create_table "character_animations", charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.integer "state", null: false
    t.string "gif_path", null: false
    t.string "description", limit: 100
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["state"], name: "index_character_animations_on_state", unique: true
  end

  create_table "character_state_logs", charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.bigint "character_id", null: false
    t.integer "state", null: false
    t.string "reason"
    t.date "target_date", null: false
    t.datetime "started_at", null: false
    t.datetime "ended_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["character_id", "started_at"], name: "index_character_state_logs_on_character_id_and_started_at"
    t.index ["character_id", "target_date"], name: "index_character_state_logs_on_character_id_and_target_date"
  end

  create_table "characters", charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "name", limit: 30
    t.integer "state", default: 0, null: false
    t.integer "sleep_points", default: 500, null: false
    t.integer "meal_points", default: 500, null: false
    t.integer "exercise_points", default: 500, null: false
    t.integer "work_points", default: 500, null: false
    t.integer "total_points", default: 500, null: false
    t.datetime "state_changed_at"
    t.date "last_reset_on"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_characters_on_user_id", unique: true
  end

  create_table "daily_achievements", charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.date "target_date", null: false
    t.decimal "sleep_score", precision: 5, scale: 1, default: "0.0", null: false
    t.decimal "meal_score", precision: 5, scale: 1, default: "0.0", null: false
    t.decimal "exercise_score", precision: 5, scale: 1, default: "0.0", null: false
    t.decimal "work_score", precision: 5, scale: 1, default: "0.0", null: false
    t.integer "sleep_change", default: 0, null: false
    t.integer "meal_change", default: 0, null: false
    t.integer "exercise_change", default: 0, null: false
    t.integer "work_change", default: 0, null: false
    t.integer "sleep_points", default: 0, null: false
    t.integer "meal_points", default: 0, null: false
    t.integer "exercise_points", default: 0, null: false
    t.integer "work_points", default: 0, null: false
    t.integer "total_points", default: 0, null: false
    t.integer "recorded_items_count", default: 0, null: false
    t.datetime "finalized_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id", "target_date"], name: "index_daily_achievements_on_user_id_and_target_date", unique: true
  end

  create_table "exercise_records", charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.datetime "started_at", null: false
    t.datetime "ended_at"
    t.integer "duration_minutes"
    t.decimal "distance_km", precision: 5, scale: 2
    t.integer "record_method", default: 0, null: false
    t.string "memo"
    t.date "recorded_on", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id", "recorded_on"], name: "index_exercise_records_on_user_id_and_recorded_on"
  end

  create_table "exercise_task_completions", charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.bigint "exercise_task_id", null: false
    t.date "target_date", null: false
    t.datetime "completed_at", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["exercise_task_id", "target_date"], name: "idx_on_exercise_task_id_target_date_02b1128951", unique: true
  end

  create_table "exercise_tasks", charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "title", limit: 100, null: false
    t.integer "position", default: 0, null: false
    t.boolean "active", default: true, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id", "position"], name: "index_exercise_tasks_on_user_id_and_position"
  end

  create_table "follows", charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.bigint "follower_id", null: false
    t.bigint "followed_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["followed_id"], name: "index_follows_on_followed_id"
    t.index ["follower_id", "followed_id"], name: "index_follows_on_follower_id_and_followed_id", unique: true
  end

  create_table "goals", charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.integer "sleep_goal_type", default: 0, null: false
    t.integer "sleep_goal_minutes"
    t.time "bedtime"
    t.time "wake_time"
    t.integer "work_goal_minutes"
    t.integer "calorie_goal"
    t.decimal "protein_goal_g", precision: 5, scale: 1
    t.decimal "fat_goal_g", precision: 5, scale: 1
    t.decimal "carbs_goal_g", precision: 5, scale: 1
    t.decimal "fiber_goal_g", precision: 5, scale: 1
    t.time "breakfast_time"
    t.time "lunch_time"
    t.time "dinner_time"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_goals_on_user_id", unique: true
  end

  create_table "meals", charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.integer "meal_type", default: 0, null: false
    t.datetime "eaten_at", null: false
    t.string "content"
    t.integer "calories"
    t.decimal "protein_g", precision: 6, scale: 1
    t.decimal "fat_g", precision: 6, scale: 1
    t.decimal "carbs_g", precision: 6, scale: 1
    t.decimal "fiber_g", precision: 6, scale: 1
    t.text "comment"
    t.integer "input_method", default: 0, null: false
    t.date "recorded_on", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id", "eaten_at"], name: "index_meals_on_user_id_and_eaten_at"
    t.index ["user_id", "recorded_on"], name: "index_meals_on_user_id_and_recorded_on"
  end

  create_table "notifications", charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "actor_id"
    t.integer "notification_type", default: 0, null: false
    t.string "title", limit: 100, null: false
    t.string "body"
    t.string "notifiable_type"
    t.bigint "notifiable_id"
    t.datetime "read_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["actor_id"], name: "index_notifications_on_actor_id"
    t.index ["notifiable_type", "notifiable_id"], name: "index_notifications_on_notifiable"
    t.index ["user_id", "created_at"], name: "index_notifications_on_user_id_and_created_at"
    t.index ["user_id", "read_at"], name: "index_notifications_on_user_id_and_read_at"
  end

  create_table "nutrition_standards", charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.integer "gender", null: false
    t.integer "age_from", null: false
    t.integer "age_to", null: false
    t.integer "activity_level", default: 2, null: false
    t.integer "calories", null: false
    t.decimal "protein_g", precision: 5, scale: 1
    t.decimal "fat_g", precision: 5, scale: 1
    t.decimal "carbs_g", precision: 5, scale: 1
    t.decimal "fiber_g", precision: 5, scale: 1
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["gender", "age_from", "activity_level"], name: "idx_on_gender_age_from_activity_level_da342ee2cb", unique: true
  end

  create_table "sleep_records", charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.datetime "slept_at", null: false
    t.datetime "woke_at"
    t.integer "duration_minutes"
    t.integer "record_method", default: 0, null: false
    t.date "recorded_on", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id", "recorded_on"], name: "index_sleep_records_on_user_id_and_recorded_on"
    t.index ["user_id", "slept_at"], name: "index_sleep_records_on_user_id_and_slept_at"
  end

  create_table "users", charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.string "provider", default: "email", null: false
    t.string "uid", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.string "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.boolean "allow_password_change", default: false
    t.datetime "remember_created_at"
    t.string "email", null: false
    t.string "name", limit: 50, null: false
    t.integer "icon", default: 0, null: false
    t.date "birthdate", null: false
    t.integer "gender", default: 0, null: false
    t.json "tokens"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["name"], name: "index_users_on_name"
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
    t.index ["uid", "provider"], name: "index_users_on_uid_and_provider", unique: true
  end

  create_table "work_records", charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "title", limit: 100
    t.datetime "started_at", null: false
    t.datetime "ended_at"
    t.integer "duration_minutes"
    t.integer "record_method", default: 0, null: false
    t.date "recorded_on", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id", "recorded_on"], name: "index_work_records_on_user_id_and_recorded_on"
  end

  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "character_state_logs", "characters"
  add_foreign_key "characters", "users"
  add_foreign_key "daily_achievements", "users"
  add_foreign_key "exercise_records", "users"
  add_foreign_key "exercise_task_completions", "exercise_tasks"
  add_foreign_key "exercise_tasks", "users"
  add_foreign_key "follows", "users", column: "followed_id"
  add_foreign_key "follows", "users", column: "follower_id"
  add_foreign_key "goals", "users"
  add_foreign_key "meals", "users"
  add_foreign_key "notifications", "users"
  add_foreign_key "notifications", "users", column: "actor_id"
  add_foreign_key "sleep_records", "users"
  add_foreign_key "work_records", "users"
end
