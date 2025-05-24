# Process Person Plugin

Obsidian 用のプラグインです。個人 CRM を Obsidian で実施している方におすすめです。xAI の API を利用して、メールアドレスや企業のドメインから人物・企業についての情報を web から収集・サマリした情報を Obsidian に追記します。

## 機能概要

- ノートの YAML frontmatter に `email` があれば、その人物について xAI API で情報を取得し、ノート末尾にマークダウン形式で追記します。
- `domain` があれば、ノート名（ファイル名）を企業名として xAI API で企業情報を取得し、ノート末尾にマークダウン形式で追記します。
- どちらもなければ通知で知らせます。
- 取得中はローディング通知を表示します。
- すべて Obsidian のツールリボン（AI アイコン）からワンクリックで実行できます。

## API キーの設定

1. プラグインを有効化後、Obsidian の「設定」→「プラグイン」→「Process Person Plugin」→「xAI API キー」欄に API キーを入力してください。
2. API キーが未設定の場合、ボタン押下時に警告が表示されます。

## ノートの YAML 例

### 人物情報

```markdown
---
email: example@example.com
company: Example Inc.
---
```

### 企業情報

```markdown
---
domain: example.com
---
```

## 追記される内容

- 取得した情報はノート末尾に `---` 区切りでマークダウン形式で追記されます。
- 人物情報は `# 人物情報 (xAIより):`、企業情報は `# 企業情報 (xAIより):` の見出しで始まります。
- xAI へのプロンプトには、人物の場合はメールアドレス・ノート名（名前）・company（あれば）、企業の場合はノート名（企業名）・domain が渡されます。
- アウトプットはマークダウン形式で、header は最大 h2 から出力されます。

## インストール方法

1. このリポジトリをクローンまたはダウンロードします。
2. 依存パッケージをインストールします:
   ```sh
   npm install
   ```
3. プラグインをビルドします:
   ```sh
   npm run build
   ```
4. `dist`フォルダ内のファイル（`main.js`, `manifest.json` など）を Obsidian のプラグインフォルダにコピーします。

## 開発方法

- `src/main.ts` にプラグインのロジックを実装します。
- TypeScript で開発し、`npm run build`でビルドしてください。

---

このプラグインは Obsidian API を利用しています。
