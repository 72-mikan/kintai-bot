---
description: 指定した issue 番号を確認し、修正・レビュー・commit・push・PR作成までを行う
---

使い方: `/fix-issue <issue番号>`（例: `/fix-issue 12`）

以下の手順で issue #$ARGUMENTS に対応してください。

1. `gh issue view $ARGUMENTS` で issue の内容を確認する
2. 作業用ブランチ `fix/issue-$ARGUMENTS` を用意する
   - `git branch --list fix/issue-$ARGUMENTS` でブランチの存在を確認する
   - 既に存在する場合: `git checkout fix/issue-$ARGUMENTS` でそのブランチに切り替え、続きの修正を行う（main の再取得や再作成は行わない）
   - 存在しない場合: `git checkout main` → `git pull origin main` で main を最新化し、`git checkout -b fix/issue-$ARGUMENTS` で新規ブランチを作成する
3. issue の内容に対応する修正を `src/` 配下に行う
   - 調査・実装の過程で、以下のいずれかに該当すると判断した場合は、そのまま実装を進めず一旦作業を中断する
     - 新しいスクリプトプロパティ（トークンやIDなど）の追加が必要で、GASエディタ側での手動設定が必須になる場合
     - LIFFアプリの追加・変更（Endpoint URLの再設定など）や、リッチメニュー構造の変更（`setupRichMenu()`の再実行・画像の再アップロードが必要になるケース）が必要な場合
     - スプレッドシートの列構成・シート構造そのものを変更する必要があり、既存データの移行が必要になる場合
   - 該当する場合は `gh issue comment $ARGUMENTS --body "..."` で、必要な変更内容とその理由をissueにコメントしたうえで、状況をユーザーに報告し指示を仰ぐ。ユーザーから続行の許可を得てから実装を再開する
4. `npx tsc --noEmit` と `npm run test` を実行する。失敗したら原因を調査して修正し、再度実行する
   - `npm run test`（vitest）は `src/` のうち GAS 組み込みAPI（`SpreadsheetApp`・`PropertiesService`・`UrlFetchApp`など）に依存しない純粋なロジック（`DateUtils.ts`など）のみが対象。それ以外の実際の動作確認（LINE上での操作・GAS実行ログの確認）は自動化できないため、PR本文に手動確認が必要な旨を明記する
5. `/code-review medium` を実行し、変更内容をレビューする。指摘があれば手順3に戻って修正し、再度手順4・5を行う。このレビュー往復は最大3回までとし、3回を超えても解消しない場合はそこで作業を止め、指摘内容と状況を報告してユーザーの判断を仰ぐ
6. レビューで問題がなければ変更内容を確認したうえで `git add` → `git commit`（コミットメッセージに `#$ARGUMENTS` を含める）
7. `git push -u origin fix/issue-$ARGUMENTS` でリモートに push する
8. `gh pr create` で PR を作成する。base ブランチは main とし、本文に `Closes #$ARGUMENTS` と、手動確認が必要な項目（LINE実機での動作確認など）を含める

制約:
- force push・`git reset --hard`・`git clean` などの破壊的操作は行わない
- 型チェックまたはテストが失敗したままの状態では push しない
- `/code-review` は `ultra` を使わない（別課金のクラウド実行のため）。effort は `medium` 固定とする
- このスキルは GAS 本体へのデプロイ（`npm run push` / `clasp push` およびGASデプロイの再作成）は行わない。PRがmainにマージされた後、動作確認のうえ別途手動でデプロイすること
- 各ステップの結果を簡潔に報告する
