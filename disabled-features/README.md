# 無効化中の機能（リリース対象外）

ここにあるコードは**今回のリリースには含めません**（Cloudflare Pages Functions は
`functions/` 配下のみをデプロイするため、このフォルダは公開されません）。

## assist.js — AI壁打ち
各STEPで Claude（`claude-opus-4-8`）が回答に対し「気づき・深掘りの問い・コピー案・次の一手」を返す機能。

### 再有効化の手順
1. `disabled-features/assist.js` を `functions/api/assist.js` に戻す
2. Cloudflare Pages の環境変数に `ANTHROPIC_API_KEY` を追加
3. `index.html` にAI壁打ちのUI（トリガーボタン・パネル・`askAI()`・CSS）を再追加
   - 対話形式に拡張する場合はこのタイミングで実装

> 一度UI込みで動作確認済み。フロント側のコードは git 履歴（このコミット以前）から復元できます。
