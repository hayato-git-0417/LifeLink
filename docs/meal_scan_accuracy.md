# 食事写真の栄養推定と精度評価

店舗別の特例は使わず、写真に見える品目と調理後の重量を推定する。栄養値は品目ごとの100gあたりの値 × 重量 / 100をサーバーで合計する。

- 食品・調理状態が候補と一致する場合は、登録済みの食品成分表を使う。初期候補はご飯、パン、ゆで麺、肉・魚の調理品、豆腐、卵、野菜、乳製品など29品。DB未登録の候補は同梱の食品成分表CSVから参照する。成分表に存在しない候補値は作らない。
- 一致する候補がなければAIが100gあたりを推定する。推定値を食品成分表と偽って表示しない。
- AIの食事全体の合計値には依存しない。完成料理とその材料・衣・油の二重加算を避ける。
- 重量や一部の栄養値が不明な場合、その栄養素の合計を空欄にする。分からない品目を0として過少表示しない。
- 解析後の「推定した品目と量を確認・修正」で重量を変え、APIの再呼び出しなしで再計算できる。内訳と修正した重量は現在の入力画面内の情報であり、保存対象は計算後の栄養値。
- 写真の本物らしさのconfidenceは栄養精度の確信度ではない。油・砂糖・器の大きさ・隠れた食品は写真だけでは確定しない。料理名・調理後の量・個数を内容欄に追記して「再解析する」で補助できる。

## 正解値の用意

test_images/tune/nutrition_truth.csv と test_images/check/nutrition_truth.csv に以下の列を用意する。空のひな形は test_images/nutrition_truth.example.csv。

path,content_hint,calories,protein_g,fat_g,carbs_g

pathはグループ内の相対パス（real/real_001.jpgなど）。栄養値はその写真全体の量に対応する1食合計。栄養表示がある商品、量を計った料理とレシピなどを根拠に記入する。正解の分からない値は空欄にし、架空の正解値を作らない。content_hintは任意。写真だけを比較する場合は空欄にし、量のヒントを入れる比較とは分ける。調整にはtuneを使い、最終比較には調整に使っていないcheckを使う。

## 実行（PowerShell）

実画像の解析は外部APIの利用料金が発生する。正解CSVがなければ解析結果だけを出力し、精度改善率は算出しない。

~~~powershell
$env:SCAN_GROUP = 'check'
$env:SCAN_LABEL = 'after'
ruby bin/rails runner script/evaluate_meal_scans.rb
~~~

結果はtmp/meal_scans_check_after.csv、集計は同名の_summary.json。栄養素ごとに平均絶対誤差、平均の過大・過小（mean_bias）、平均絶対百分率誤差、推定できた割合を記録する。百分率は正解0のケースを除外し、絶対誤差には含める。推定不能・拒否を除外して見かけの誤差だけ改善しないよう、coverage_percentとmissing_countを必ず併せて比較する。品目別の生のAI応答もCSVに残す。

保存済み結果に正解値を追加して、APIを呼ばずに再集計する場合:

~~~powershell
$env:SCAN_GROUP = 'check'
$env:SCAN_REPLAY = 'tmp/meal_scans_check_after.csv'
$env:SCAN_LABEL = 'after_scored'
ruby bin/rails runner script/evaluate_meal_scans.rb
~~~

旧方式のbefore結果と新方式のafter結果を同じ写真・同じヒント・同じ正解値で比較する。変更前の結果がなければ、改善率を推測で報告しない。旧結果と新結果の取得条件が異なる場合も差を明記する。

## 画像とモデルの比較設定（2026-11-18）

写真は長辺1536px・2MB未満を上限に準備する。サーバーでは条件を満たすメタデータなしJPEGを再圧縮しない。EXIF等がある画像は回転補正とメタデータ削除を行う。解像度を上げる分、以前より通信量や画像入力料金が増える可能性がある。画像の大きさを変える比較とモデルだけを変える比較は別々に行う。

解析モデルは既定のgpt-5.4-miniを維持する。アプリで使うモデルはOPENAI_MEAL_MODEL、評価スクリプトの比較モデルはSCAN_MODELで指定できる。利用可能なモデル名を設定し、モデルだけで栄養精度が保証されるとは扱わない。評価CSVにmodel_usedとinput_image_bytesを保存する。

~~~powershell
$env:SCAN_MODEL = 'gpt-5.4'
$env:SCAN_LABEL = 'model_comparison'
ruby bin/rails runner script/evaluate_meal_scans.rb
~~~

このコマンドは実画像をAPIへ送信するため利用料金が発生する。実測に使う正解値付き写真がない段階では、機能テストの成功を精度向上率として報告しない。
