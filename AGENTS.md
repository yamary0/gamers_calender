# Repository Guidelines

## Project Structure & Module Organization
Treat this layout as canonical while scaffolding grows. Place feature code in `src/feature-name/` (for example `src/events/`) and group shared helpers in `src/lib`. API clients and persistence live in `src/services`, and reusable UI elements in `src/components`. Mirror that tree under `tests/` for coverage and fixtures. Keep static content such as images or JSON seeds in `assets/`. Add a brief `README.md` whenever you introduce a new top-level folder.

## Build, Test, and Development Commands
When the Node.js toolchain is in place, run `npm install` once per clone. `npm run dev` should launch the local client with hot reload, while `npm run build` produces the production bundle and must finish without warnings before merging. Execute `npm test` for the automated suite. Surface any repeatable task through an npm script (e.g. `npm run e2e`) so it appears in `npm run`.

## Coding Style & Naming Conventions
Write TypeScript end to end. Keep modules small and export the public surface via an `index.ts`. Use 2-space indentation, single quotes, and trailing commas. Component files follow `PascalCase.tsx`; hooks use `useThing.ts`. Utility helpers belong in `src/lib` and stay `camelCase`. Run `npm run lint` (ESLint) and `npm run format` (Prettier) before opening a pull request, and document any rule override inline.

## Testing Guidelines
Use Jest for unit and integration coverage. Store tests in `tests/<feature>/` and name unit specs `*.spec.ts`; broader flows go in `*.int.ts`. Target at least 80% statement and branch coverage. Run `npm test -- --watch` while iterating and `npm test -- --coverage` before pushing. Structure each test with clear arrange/act/assert comments so regressions are easy to trace.

## Commit & Pull Request Guidelines
Adopt Conventional Commit prefixes (`feat:`, `fix:`, `chore:`, `test:`, `docs:`) with an imperative summary. Keep commits focused and avoid mixing refactors with functional work. Pull requests need a short summary, screenshots or terminal output for visible changes, links to relevant issues, and a list of tests executed. Flag breaking changes explicitly and document migration steps in the description.

## Configuration & Secrets
Store secrets in `.env.local` (ignored by Git) and share sanitized defaults in `.env.example`. Never commit API keys or service credentials. If something leaks, rotate it immediately and document the fix in the pull request.

前提：**まずローカルだけで常時 `pnpm dev` が通る最小構成 → 機能を1つずつ追加 → 最後にデプロイ**。

## フェーズ0：環境固定

1. `nvm use --lts && corepack enable`
2. `pnpm -v && node -v` を記録
3. リポジトリ初期化：`git init && echo "node_modules\n.next\n.env*\n" > .gitignore`

## フェーズ1：骨組みだけで起動

1. `pnpm create next-app@latest --ts --eslint --tailwind --app --src-dir`
2. 起動確認：`pnpm dev`
3. ヘルスチェック追加

   * `app/api/healthz/route.ts` で `return Response.json({ok:true})`
   * ブラウザで `/api/healthz` が 200

## フェーズ2：実験用ダッシュボード

1. トップに以下のみ表示

   * アプリ名、`NEXT_PUBLIC_APP_VERSION`
   * `/api/ping` の結果
2. `app/api/ping/route.ts` を作成し `{pong:true}` 返却
3. `.env.local` に `NEXT_PUBLIC_APP_VERSION=0.0.1`

## フェーズ3：監視点と最低限の品質

1. `package.json` にスクリプト

   * `"typecheck": "tsc --noEmit"`
   * `"lint": "next lint"`
   * `"check": "next info && pnpm list --depth=0"`
2. pre-commit（任意）：Husky + lint-staged で `typecheck` と `lint` 実行
3. 失敗可視化：エラートースト用の小コンポーネントを1つ

## フェーズ4：モックAPIでMVP動作

1. インメモリ実装で3エンドポイント

   * `POST /api/sessions`（title, max_players）
   * `GET /api/sessions`
   * `POST /api/sessions/[id]/join`
2. 画面

   * 一覧、作成フォーム、参加ボタンのみ
3. 成立条件：参加数が `max_players` 到達で `status=active` に更新
4. ここまで常に `pnpm dev` が通ることを再確認

## フェーズ5：UI基盤を最小導入

1. shadcn/ui init → `Button` と `Card` のみ追加
2. Tailwind の `container` と基本レイアウト確定（ヘッダ/メイン/フッタ）

## フェーズ6：データ層を本物に差し替え

選択A（最短）：**最初だけ** Supabase のテーブルに直書き（匿名キーで簡易接続）

* `sessions(id uuid pk, title text, max_players int, status text, created_at)`
* `participants(session_id uuid fk, user_id text, created_at)`
* APIはモックと**同じレスポンス**を維持
* `.env.local` に `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY`
* RLSは後回しでOK

選択B（完全ローカル志向）：最初は**インメモリのまま**で機能完成→後からDB差し替え

* 小規模なら当面これで十分。速度最優先

## フェーズ7：認証は最小から

1. 初回は**未認証でも動作**させる
2. 後で Supabase Auth を追加し、`user.id` を `participants` に保存

## フェーズ8：Discord 通知はWebhookのみ

1. 成立時に Webhook POST（Bot/OAuthは後回し）
2. Webhook URL は `.env.local` に保持。未設定なら no-op

## フェーズ9：リアルタイム（任意）

1. Supabase Realtime 購読で一覧の自動更新
2. まずは手動更新でも可。実装コストと相談

## フェーズ10：完了条件（ローカルMVP）

* `pnpm dev` が安定
* セッション作成・参加・成立が一気通貫で動く
* `/api/healthz` が常に 200
* 失敗時はUIで原因が見える

## フェーズ11：デプロイ前チェック

1. `.env.local` を `.env.example` に整理（鍵は空欄）
2. ビルド通過：`pnpm build && pnpm start`
3. ESM/TSの型エラーゼロ、ESLint警告ゼロを確認

## フェーズ12：デプロイ

* Vercel を想定

1. リポジトリをGitHubへPush
2. VercelでImport。環境変数を `.env.example` に合わせて入力
3. デプロイURLで `/api/healthz` と基本動線を確認

---

### 毎ステップで詰まった時の最短デバッグ

1. キャッシュ破棄：`rm -rf .next node_modules && pnpm i`
2. 型とLint：`pnpm typecheck && pnpm lint`
3. エントリ最小化：`app/layout.tsx` と `app/page.tsx` のみに戻す
4. ポート競合：`lsof -i :3000`
5. `.env.local` を一時的に空にし、外部依存を切って再実行

---

必要なら、いまのリポジトリ構成に合わせて**具体的なファイル雛形**と**APIハンドラ**の最小実装を提示する。
