LifeLink ミールスキャン 写真判定テスト用60枚セット
=================================================

内容
  - 本物の料理候補 30枚： test_images/{tune,check}/real/
  - 食品サンプル 30枚： test_images/{tune,check}/sample/
  - 基準調整用 tune は各20枚、最終確認用 check は各10枚
  - このZIPにはユーザー提供の4枚のみ実画像を同梱しています。
  - 残り56枚はWikimedia Commonsからダウンロードして揃える方式です。
  - AI生成画像は使っていません。

使い方（Windows PowerShell）
  1. このZIPの中身を C:\LL\LifeLink に展開する。
  2. PowerShellで次のコマンドを実行する。

       cd C:\LL\LifeLink
       powershell -ExecutionPolicy Bypass -File .\download_test_images.ps1

  3. "本物候補: 30/30枚 食品サンプル: 30/30枚" を確認する。
  4. review_images.html をダブルクリックして、1枚ずつ正解ラベルを目視確認する。
  5. 当初の評価スクリプト（evaluate_meal_scans.rb）で2枚からテストし、
     問題がなければ tune → check の順番に解析する。

重要
  - 本物の料理候補3枚は以前の会話でユーザーが提供した画像です。
    撮影元が確認できないため、実物の料理であることを確認してから正解に含めてください。
  - 食品サンプルの1枚もユーザー提供の画像です。
  - Wikimedia Commons掲載画像も、カテゴリ分類が絶対に正しいわけではありません。
    画像を確認して誤分類や同一画像の別カットを除いてください。
  - Commonsの出典URLと各ファイルのライセンスは image_sources.csv および
    download_log.csv から確認できます。画像の外部公開・再配布にはライセンス条件を守ってください。
  - 自動でダウンロードした画像については「本物」を個別に確認・保証していません。
  - ダウンロードにはインターネット接続が必要です。
  - スキャン1枚ごとにOpenAI API利用料金が発生します。
  - 画像を縮小してもAIによる実物判定の信頼性が保証されるわけではありません。
  - review_images.html はネットワーク接続なしで閲覧できますが、
    ダウンロード前の画像は表示されません。

Wikimedia Commons: https://commons.wikimedia.org/
食品サンプル出典カテゴリ: https://commons.wikimedia.org/wiki/Category:Food_samples_in_Japan
