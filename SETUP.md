# LINE 勤怠管理アプリ セットアップガイド

## 全体の流れ

```
1. LINE Developer アカウント作成
2. Messaging API チャンネル作成（Botの本体）
3. Google スプレッドシート作成
4. GAS プロジェクト作成 (clasp)
5. GAS デプロイ → Webhook URL 取得
6. LINE Webhook 設定
7. LINE Login チャンネル作成 → LIFFアプリ追加 → LIFF ID 取得  ← ここ重要！
8. Script Properties 設定（GAS）
9. 初期化関数の実行
10. リッチメニュー設定
```

> **重要:** Messaging API チャンネルと LINE Login チャンネルは **別チャンネル** ですが、
> **同じ Provider** に作成することで同一ユーザーIDが使われます。

---

## ステップ 1: LINE Developer アカウント

1. https://developers.line.biz/ にアクセス
2. 右上「Log in」→ LINE アカウントでログイン
3. 「Create」→ Provider を作成（例: 自分の名前）

---

## ステップ 2: Messaging API チャンネル作成

> **注意:** 現在は LINE Developers Console から直接「Messaging API」チャンネルを
> 作成することはできません。LINE公式アカウントを作成し、
> LINE Official Account Manager 側で Messaging API を有効化する流れに変わりました。

1. Provider ページ → 「Create a new channel」→ Channel type: **Messaging API** を選択
2. 「It's no longer possible to create Messaging API channels directly from the LINE Developers Console.」という案内が表示されるので、
   「**Create a LINE Official Account**」ボタンをクリック（外部サイトへ遷移）
3. LINE Official Account Manager 側でアカウント情報を入力して公式アカウントを作成:
   - アカウント名: 勤怠管理Bot
   - 業種など: 任意
4. 作成後、LINE Official Account Manager（https://manager.line.biz/）にアクセス
5. 対象アカウントを選択 →「設定」→「Messaging API」タブを開く
6. **Messaging API を利用する** ボタンで有効化
   - Provider の選択を求められるので、ステップ1で作成した **Provider を選択**
     （LINE Loginチャンネルと同じProviderにするため）
7. 有効化すると、LINE Developers Console 側にも同名の「Messaging API」チャンネルが自動作成される
8. LINE Developers Console → 作成されたチャンネルを開き、「Messaging API」タブ →
   「Channel access token」→ **Issue** ボタンをクリックし、トークンをコピー
9. 「Basic settings」タブ → **Channel secret** をコピー

---

## ステップ 3: Google スプレッドシート作成

1. https://sheets.google.com で新しいスプレッドシートを作成
2. シート名「Sheet1」を「基本設定」に変更
3. URL から **スプレッドシートID** をコピー
   ```
   https://docs.google.com/spreadsheets/d/【ここがID】/edit
   ```

---

## ステップ 4: GAS プロジェクトのセットアップ

### Node.js のインストール
https://nodejs.org から LTS 版をインストール

### clasp のセットアップ
```bash
# このプロジェクトフォルダで実行
cd /path/to/kintai

# 依存パッケージのインストール
npm install

# clasp にログイン（ブラウザが開く）
npx clasp login

# 新しい GAS プロジェクトを作成
npx clasp create --title "勤怠管理Bot" --type webapp --rootDir src

# ※ 既存のスクリプトIDを使う場合は .clasp.json.example をコピーして編集
cp .clasp.json.example .clasp.json
# .clasp.json の scriptId を書き換える
```

### GAS へコードをプッシュ
```bash
npm run push
# または
npx clasp push
```

---

## ステップ 5: GAS デプロイ（Webhook URL の取得）

1. https://script.google.com でプッシュしたプロジェクトを開く
2. 右上「デプロイ」→「新しいデプロイ」
3. 設定:
   - 種類: ウェブアプリ
   - 説明: v1
   - 次のユーザーとして実行: **自分**
   - アクセスできるユーザー: **全員**
4. 「デプロイ」→ **ウェブアプリ URL** をコピー

---

## ステップ 6: LINE Webhook の設定

1. LINE Developer Console → Messaging API タブ
2. 「Webhook settings」→「Webhook URL」に GAS の URL を貼り付け
3. 「Verify」ボタンで確認 → Success が出ればOK
4. 「Use webhook」を ON にする
5. 「Auto-reply messages」を OFF にする（ボットが返答するため）

---

## ステップ 7: LINE Login チャンネルの作成 と LIFF アプリの追加

> **注意:** 2019年以降、LIFFアプリは Messaging API チャンネルに追加できません。
> **LINE Login チャンネル**（別チャンネル）に追加する必要があります。
> ただし、**同じ Provider** に作れば ユーザーIDは共通**になります。

### 7-1. LINE Login チャンネルを作成する

1. LINE Developer Console → **勤怠管理Bot と同じ Provider** を開く
2. 「Create a new channel」→ **LINE Login** を選択
3. 必要事項を入力:
   - Channel name: 勤怠管理LIFF
   - Channel description: 勤怠管理用LIFF
   - App types: **Web app** にチェック
4. 「Create」で作成

### 7-2. LIFF アプリを追加する

1. 作成した **LINE Login チャンネル** を開く
2. 「LIFF」タブ → 「Add」
3. 設定:
   - Name: 勤怠管理
   - Size: **Full**（全画面）
   - Endpoint URL: GAS のウェブアプリ URL（ステップ5でコピーしたもの）
   - Scope: `profile` にチェック
   - Bot link feature: **On (Aggressive)** を選択
     ※ これで Messaging API Bot と連携できます
4. 「Add」で作成 → **LIFF ID** をコピー

> LIFF ID の形式: `1234567890-xxxxxxxx`

---

## ステップ 8: Script Properties の設定

GAS エディタで設定する環境変数（APIキーなど）を登録します。

1. GAS エディタ → 左メニュー「プロジェクトの設定」（歯車アイコン）
2. 「スクリプト プロパティ」→「プロパティを追加」

| プロパティ名 | 値 |
|---|---|
| `SPREADSHEET_ID` | ステップ3でコピーしたID |
| `LINE_CHANNEL_ACCESS_TOKEN` | ステップ2でコピーしたトークン |
| `LINE_CHANNEL_SECRET` | ステップ2でコピーしたシークレット |
| `LIFF_ID` | ステップ7でコピーしたID |

---

## ステップ 9: 初期化関数の実行

GAS エディタで以下の順番で関数を実行します（初回のみ）。

1. GAS エディタ上部のドロップダウンから関数を選択 →「▶ 実行」
2. 初回実行時に権限確認ダイアログ → 「権限を確認」→「詳細」→「許可」

```
① initializeSystem()   → スプレッドシート初期化 + トリガー設定
② setupRichMenu()      → リッチメニュー構造の作成（画像なし）
```

> `setupRichMenu()` は LIFF_ID を設定した後に実行してください。
> 実行ログに `richMenuId` が表示されます（後で使います）。

---

## ステップ 10: リッチメニュー画像のアップロードと有効化

LINE APIの仕様上、**画像をアップロードしないとリッチメニューは有効化できません**。

### 10-1. 画像を用意する

| 項目 | 値 |
|---|---|
| サイズ | **2500 × 843 px** |
| 形式 | JPEG または PNG |
| レイアウト | 4等分（各 625×843px） |

左から順に文字やアイコンを配置:
```
[ 基本設定 ] [ 勤怠入力 ] [ 勤怠修正 ] [ 勤怠表の出力 ]
```

Canva・PowerPoint・Figmaなどで作成できます。

### 10-2. LINE Official Account Manager で画像をアップロード

1. https://manager.line.biz/ を開く
2. 対象アカウント →「チャットルーム管理」→「リッチメニュー」
3. `setupRichMenu()` で作成されたメニューを選択
4. 画像をアップロードして保存

### 10-3. GAS で有効化する

画像アップロード後、GAS エディタで実行:

```
③ activateRichMenu()   → リッチメニューを全ユーザーに適用
```

---

## 動作確認

1. LINE アプリでボットを友達追加（LINE Developer Console の「Messaging API」タブにある QR コード）
2. ボットに「基本設定」と送信 → LIFF が開くことを確認
3. 開始・終了・休憩時間を設定して「登録」
4. 「勤怠入力」で今日の勤怠を入力
5. 「勤怠表の出力」で今月分をLINEに送信

---

## トリガーの動作

| 時刻 | 動作 |
|---|---|
| 18:00〜18:59 | 勤怠未登録の場合、通知メッセージを送信 |
| 22:00〜22:59 | 勤怠未登録の場合、通知メッセージを送信 |
| 00:00〜00:59 | 前日の勤怠が未登録の場合、基本設定値で自動登録 |

※ 土日・祝日（日本の祝日カレンダー参照）は通知・自動登録を行いません。

---

## コードの更新方法

```bash
# コードを修正後
npm run push

# GAS エディタで再デプロイ（「デプロイ」→「デプロイを管理」→「編集」→「バージョン: 新バージョン」）
```
