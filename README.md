# シセイラボ｜12STEP マーケティング戦略・戦術立案システム

シセイラボの実践メソッド（5フェーズ × 12ステップ）を、企業が自分で順番に答えるだけで
マーケティング戦略書を作成できる Web システムです。`index.html`（フロント）と
Cloudflare Pages Functions + D1（バックエンド）で構成され、GitHub 連携でそのまま公開できます。

## 機能
- **ランディングページ**：メソッドの全体像・使い方を紹介
- **12STEP立案ウィザード**：各STEPの問いに回答。ブラウザ内に自動保存（localStorage）
- **戦略書アウトプット**：回答を1枚の戦略書に整形。印刷／PDF保存対応
- **☁️ シセイラボに送信**：会社名・メールを添えて戦略書をクラウド(D1)に保存
- **💬 アドバイス確認**：シセイラボが返したコメントを企業側で受信・表示
- **🧭 アドバイザー管理画面**：管理者パスワードでログイン → 送信一覧 → 各STEPにコメント → クラウド保存で即時返却
- **共有コード（フォールバック）**：クラウド未設定でも、コードのコピペで助言のやり取りが可能

デザインはシセイラボのデジタルカタログに準拠（ネイビー #14233A ／ アクセント橙 #D96A2C ／ Noto Serif JP・Noto Sans JP）。

> AI壁打ち機能（Claude API）は今回のリリースには含めていません。コードは `disabled-features/` に保全済みで、後から有効化できます。

## 構成
```
index.html            … LP（トップ）＋アドバイザー管理画面＋用語集
start.html            … 戦略立案ツール（独立ページ）。回答が進むと「ブランドの庭」が育つ＋戦略書/送信
shisei-data.js        … 12STEPメソッドの共有データ（PHASES/STEPS/GLOSSARY）。index.html と start.html で共用
functions/api/        … Pages Functions（API）
  submit.js   POST  企業の送信（新規/更新）
  mine.js     GET   企業が自分の回答+アドバイスを取得
  list.js     GET   管理者：送信一覧（要 X-Admin-Token）
  get.js      GET   管理者：1件詳細（要 X-Admin-Token）
  advise.js   POST  管理者：コメント/ステータス保存（要 X-Admin-Token）
schema.sql            … D1 テーブル定義
wrangler.toml         … Pages + D1 バインディング設定
.dev.vars             … ローカル用の管理者トークン（gitignore済み）
```

## ローカルで確認
フロントだけ見るなら静的サーバーで十分：
```bash
python3 -m http.server 4321   # → http://localhost:4321
```
クラウド機能（送信・一覧・アドバイス）も含めて確認するなら Wrangler：
```bash
# 1) ローカルD1にスキーマ適用
npx wrangler d1 execute shisei_strategy --local --file=schema.sql
# 2) Pages + Functions + D1 を起動（.dev.vars の ADMIN_TOKEN が読まれる）
npx wrangler pages dev . --port 8788   # → http://localhost:8788
```

## 公開（GitHub → Cloudflare Pages）
1. **D1 作成**：`npx wrangler d1 create shisei_strategy` → 表示された `database_id` を `wrangler.toml` に貼る
2. **本番D1にスキーマ適用**：`npx wrangler d1 execute shisei_strategy --remote --file=schema.sql`
3. このフォルダを GitHub にプッシュ（`.key` 原本・`.dev.vars` は `.gitignore` で除外）
4. **Cloudflare Pages** で当該リポジトリを連携
   - ビルド設定：Framework preset **None** / Build command **空** / Output directory **`/`**
5. Pages プロジェクトの **設定 > Functions > D1 バインディング** で `DB = shisei_strategy` を追加
6. **設定 > 環境変数** で `ADMIN_TOKEN`（長いランダム文字列）を追加 ← アドバイザー画面のログインパスワード
7. デプロイ完了で公開。`/`＝LP・ツール、アドバイザーはトップ右上「アドバイザー」から

### 送信時のメール通知（Resend）
送信ボタンで戦略書を **hello@s-labo.earth と登録ユーザーの両方に全文メール**で送ります。有効化には以下を設定：
1. [Resend](https://resend.com) でアカウント作成 → **Domains** で `s-labo.earth` を追加し、表示される **DNSレコード（SPF/DKIM）をドメインに登録**して認証する
2. Resend の **API Keys** でキーを発行
3. Cloudflare Pages の **設定 > 環境変数** に追加：
   - `RESEND_API_KEY`（必須）… 発行したAPIキー
   - `MAIL_FROM`（任意）… 既定 `シセイラボ 戦略立案 <noreply@s-labo.earth>`（送信元。認証済みドメインのアドレスにする）
   - `MAIL_TO`（任意）… 既定 `hello@s-labo.earth`（運営の受信先）
4. 未設定でも送信＝保存は成功し、画面に「メール送信は未完了」と表示される（保存内容はアドバイザー画面で確認可能）。

## データの取り扱い
- 企業の入力は **D1（Cloudflare上のDB）に保存**され、シセイラボがアドバイザー画面で確認します。
- 送信モーダルに「送信内容はシセイラボが保存・確認します」と明記済み。
- 各企業データは `token`（推測困難なシークレット）でひも付き、企業本人だけが `mine` API で再取得できます。
- 一覧/詳細/アドバイス保存の管理API は `ADMIN_TOKEN` がないと 401 で拒否されます。

## 今後の拡張案
- AI壁打ちの会話化（1問1答→対話的に深掘り）／戦略書まるごとのAIレビュー
- 企業↔アドバイザーのリアルタイム通知（メール送信・Webhook）
- 管理画面の認証強化（Cloudflare Access 等）
