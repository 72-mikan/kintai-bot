# LINE勤怠管理アプリ

LINEひとつで日々の勤怠（出勤・退勤・休憩・作業内容）を記録し、月次で集計・出力できる個人向け勤怠管理Botです。Google Apps Script（GAS）+ TypeScript + LIFF（LINE Front-end Framework）で構築されています。

## 主な機能

LINEのリッチメニューから、以下の4つのLIFF画面を呼び出して操作します。

| メニュー | できること |
|---|---|
| 基本設定 | デフォルトの開始時間・終了時間・休憩時間を設定 |
| 勤怠入力 | 日付を選んで開始/終了/休憩時間・作業内容を入力（実働時間は自動計算） |
| 勤怠修正 | 既存の日付を選ぶと登録済みの内容を読み込んで修正・再保存 |
| 勤怠表の出力 | 指定した月の勤怠一覧をLIFF上でプレビューし、LINEにテキストで送信 |

さらに、GASのトリガーによって以下を自動化しています（土日・日本の祝日は対象外）。

- 18:00台・22:00台：当日の勤怠が未登録の場合にLINEでリマインド通知
- 0:00台：前日分が未登録のまま日付が変わった場合、基本設定のデフォルト値で自動登録

## デモ

https://github.com/user-attachments/assets/33b5f81e-968c-4f2d-849e-9a4230cc9510

## 技術スタック

- Google Apps Script（GAS）+ TypeScript（[clasp](https://github.com/google/clasp) でpush/デプロイ）
- LIFF（LINE Front-end Framework）によるフォームUI（バニラJS + HTML）
- データストア: Googleスプレッドシート（月次シート＋基本設定シート）
- LINE Messaging API（Webhook / Push message）
- テスト: [Vitest](https://vitest.dev/)（GAS組み込みAPIに依存しない純粋ロジックのみ対象）

## ディレクトリ構成

```
src/
  Code.ts               エントリーポイント（doGet/doPost、LIFFから呼ばれるAPI関数）
  LineWebhook.ts         LINE Webhookイベントの処理・メニュー分岐
  LineApi.ts             LINE Messaging APIラッパー、勤怠レポート整形
  SpreadsheetService.ts  スプレッドシートの読み書き
  DateUtils.ts           日付・時刻まわりの純粋ロジック
  TriggerService.ts      時間主導トリガーの設定・自動リマインド/自動登録
  Types.ts               型定義
  Input.html / Output.html / Settings.html / Menu.html   LIFF画面
test/                    Vitestによる単体テスト（純粋ロジックのみ）
```

## セットアップ

LINE Developer Console・GASプロジェクト作成からリッチメニュー設定までの手順は [SETUP.md](./SETUP.md) を参照してください。

## 開発

```bash
npm install          # 依存パッケージのインストール
npx tsc --noEmit      # 型チェック
npm run test          # 単体テスト（Vitest）
npm run push          # GASへコードを反映（clasp push）
npm run deploy        # 新しいバージョンをデプロイ（clasp deploy）
npm run open          # GASエディタをブラウザで開く
```

`npm run test` は `SpreadsheetApp`・`PropertiesService`・`UrlFetchApp` などGAS組み込みAPIに依存しない純粋なロジック（`DateUtils.ts` など）のみを対象としています。LINE上での実際の操作やGAS実行ログの確認は自動化できないため、手動で確認してください。
