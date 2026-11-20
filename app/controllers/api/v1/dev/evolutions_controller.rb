# 進化のテストパネル（開発用）。ホームの「進化テスト」から、記録・日を進める・毎日記録して進める・直接決める・リセットを試す。
# ルートは development・test だけに作る（config/routes.rb）。念のためここでも本番では 404 にする。
# 操作は EvolutionSandbox。どの操作も、今の進化の状態・段階ごとの画像・最近の増減履歴を返す
module Api
  module V1
    module Dev
      class EvolutionsController < BaseController
        HISTORY_LIMIT = 15

        before_action :ensure_local_env

        # GET /api/v1/dev/evolution
        def show
          render_state
        end

        # POST /api/v1/dev/evolution/record { item: "meal" }
        def record
          item = item_param
          render_state(action: "record", item: item, log: log_json(sandbox.record(item)))
        end

        # POST /api/v1/dev/evolution/advance { days: 3 }
        def advance
          days = int_param(:days, 1..EvolutionSandbox::MAX_DAYS)
          render_state(action: "advance", days: days, log: log_json(sandbox.advance(days)))
        end

        # POST /api/v1/dev/evolution/simulate { days: 30, items: 4 }
        def simulate
          days = int_param(:days, 1..EvolutionSandbox::MAX_DAYS)
          items = int_param(:items, 1..ScoreCalculator::ITEMS.size)
          before, after = sandbox.simulate(days: days, items: items)
          render_state(action: "simulate", days: days, items: items, before: before.to_h, after: after.to_h)
        end

        # PATCH /api/v1/dev/evolution { points: 3000 } または { streak_days: 89 }
        def update
          if params.key?(:points)
            points = int_param(:points, 0..EvolutionSandbox::MAX_POINTS)
            sandbox.set_points(points)
            render_state(action: "set_points", points: points)
          else
            days = int_param(:streak_days, 0..EvolutionSandbox::MAX_STREAK)
            sandbox.set_streak(days)
            render_state(action: "set_streak", streak_days: days)
          end
        end

        # DELETE /api/v1/dev/evolution（最初の状態に戻す）
        def destroy
          sandbox.reset
          render_state(action: "reset")
        end

        private

        def ensure_local_env
          head :not_found unless Rails.env.local?
        end

        def sandbox
          @sandbox ||= EvolutionSandbox.new(user: current_user)
        end

        def render_state(**result)
          character = current_user.character.reload
          render json: {
            result: result.presence,
            evolution: evolution_json(character),
            image_path: character.image_path,
            today: sandbox.today,
            last_recorded_on: character.last_recorded_on,
            decay_processed_through: character.decay_processed_through,
            stages: EvolutionRules.thresholds.each_with_index.map do |points, stage|
              { stage: stage, points: points, image_path: Character.stage_image_path_for(stage) }
            end,
            logs: character.evolution_point_logs.recent_first.limit(HISTORY_LIMIT).map { |log| log_json(log) }
          }
        end

        def log_json(log)
          log&.as_json(only: %i[id reason item target_date amount multiplier_tenths missed_days points_after stage_after])
        end

        def item_param
          item = params.require(:item).to_s
          raise InvalidParam, "item は #{ScoreCalculator::ITEMS.join(' / ')} のどれかにしてください" unless ScoreCalculator::ITEMS.map(&:to_s).include?(item)

          item.to_sym
        end

        def int_param(key, range)
          value = Integer(params.require(key).to_s, exception: false)
          raise InvalidParam, "#{key} は #{range.first}〜#{range.last} の整数にしてください" unless value && range.cover?(value)

          value
        end
      end
    end
  end
end
