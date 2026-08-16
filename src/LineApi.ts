const LINE_API_BASE = 'https://api.line.me/v2/bot';

function getLineToken(): string {
  const token = PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN');
  if (!token) throw new Error('Script Property "LINE_CHANNEL_ACCESS_TOKEN" が設定されていません');
  return token;
}

function linePost(path: string, body: object): GoogleAppsScript.URL_Fetch.HTTPResponse {
  return UrlFetchApp.fetch(`${LINE_API_BASE}${path}`, {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getLineToken()}`,
    },
    payload: JSON.stringify(body),
    muteHttpExceptions: true,
  });
}

// ---- メッセージ送信 ----

function replyMessage(replyToken: string, messages: object[]): void {
  linePost('/message/reply', { replyToken, messages });
}

function pushMessage(userId: string, messages: object[]): void {
  linePost('/message/push', { to: userId, messages });
}

function createTextMessage(text: string): object {
  return { type: 'text', text };
}

// LIFFを開くボタンメッセージ
function createLiffButtonMessage(altText: string, label: string, page: string): object {
  const liffId = PropertiesService.getScriptProperties().getProperty('LIFF_ID') || '';
  return {
    type: 'template',
    altText,
    template: {
      type: 'buttons',
      text: altText,
      actions: [
        {
          type: 'uri',
          label,
          uri: `https://liff.line.me/${liffId}?page=${page}`,
        },
      ],
    },
  };
}

// ---- 勤怠レポート生成 ----

function formatAttendanceReport(year: number, month: number, records: AttendanceRecord[]): string {
  const monthLabel = `${year}年${month}月`;
  let report = `【${monthLabel} 勤怠表】\n\n`;
  let totalMinutes = 0;
  let workDays = 0;

  for (const r of records) {
    const date = parseDate(r.date);
    const d = date.getDate();
    const dayStr = `${String(d).padStart(2, ' ')}日(${r.dayOfWeek})`;

    if (!r.startTime) {
      report += `${dayStr} ─\n`;
    } else {
      let line = `${dayStr} ${r.startTime}〜${r.endTime} 休${r.breakTime || '─'} 実${r.workingTime}`;
      if (r.workContent) line += ` ${r.workContent.replace(/\r?\n/g, ' ')}`;
      report += line + '\n';
      totalMinutes += timeToMinutes(r.workingTime);
      workDays++;
    }
  }

  report += `\n勤務日数: ${workDays}日`;
  report += `\n総稼働時間: ${minutesToTime(totalMinutes)}`;
  return report;
}

// ---- LINE Webhook 署名検証 ----

function verifySignature(rawBody: string, signature: string): boolean {
  const secret = PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_SECRET') || '';
  if (!secret) return false;
  const hmac = Utilities.computeHmacSha256Signature(rawBody, secret);
  const expected = Utilities.base64Encode(hmac);
  return expected === signature;
}

// ---- リッチメニュー設定 ----

function setupRichMenu(): void {
  const props = PropertiesService.getScriptProperties();
  const liffIdSettings = props.getProperty('LIFF_ID_SETTINGS') || '';
  const liffIdInput = props.getProperty('LIFF_ID_INPUT') || '';
  const liffIdOutput = props.getProperty('LIFF_ID_OUTPUT') || '';
  if (!liffIdSettings || !liffIdInput || !liffIdOutput) {
    throw new Error('LIFF_ID_SETTINGS / LIFF_ID_INPUT / LIFF_ID_OUTPUT が設定されていません');
  }

  const richMenu = {
    size: { width: 2500, height: 843 },
    selected: true,
    name: '勤怠管理メニュー',
    chatBarText: 'メニュー',
    areas: [
      {
        bounds: { x: 0, y: 0, width: 625, height: 843 },
        action: {
          type: 'uri',
          label: '基本設定',
          uri: `https://liff.line.me/${liffIdSettings}?openExternalBrowser=1`,
        },
      },
      {
        bounds: { x: 625, y: 0, width: 625, height: 843 },
        action: {
          type: 'uri',
          label: '勤怠入力',
          uri: `https://liff.line.me/${liffIdInput}?openExternalBrowser=1`,
        },
      },
      {
        bounds: { x: 1250, y: 0, width: 625, height: 843 },
        action: {
          type: 'uri',
          label: '勤怠修正',
          uri: `https://liff.line.me/${liffIdInput}?openExternalBrowser=1`,
        },
      },
      {
        bounds: { x: 1875, y: 0, width: 625, height: 843 },
        action: {
          type: 'uri',
          label: '勤怠表の出力',
          uri: `https://liff.line.me/${liffIdOutput}?openExternalBrowser=1`,
        },
      },
    ],
  };

  const res = linePost('/richmenu', richMenu);
  const json = JSON.parse(res.getContentText());
  const richMenuId: string = json.richMenuId;

  if (!richMenuId) {
    throw new Error(`リッチメニュー作成失敗: ${res.getContentText()}`);
  }

  // richMenuId をプロパティに保存（activateRichMenu() で使用）
  PropertiesService.getScriptProperties().setProperty('RICH_MENU_ID', richMenuId);

  console.log('=== リッチメニュー作成完了 ===');
  console.log(`richMenuId: ${richMenuId}`);
  console.log('');
  console.log('【次のステップ】');
  console.log('1. https://manager.line.biz/ を開く');
  console.log('2. 対象アカウント →「チャットルーム管理」→「リッチメニュー」');
  console.log('3. 作成されたリッチメニューに 2500×843px の画像をアップロード');
  console.log('4. 画像アップロード後、GASエディタで activateRichMenu() を実行');
}

// 画像アップロード後に実行してリッチメニューを有効化する
function activateRichMenu(): void {
  const richMenuId = PropertiesService.getScriptProperties().getProperty('RICH_MENU_ID');
  if (!richMenuId) {
    throw new Error('RICH_MENU_ID が未設定です。先に setupRichMenu() を実行してください');
  }

  UrlFetchApp.fetch(`${LINE_API_BASE}/user/all/richmenu/${richMenuId}`, {
    method: 'post',
    headers: { Authorization: `Bearer ${getLineToken()}` },
    muteHttpExceptions: true,
  });

  console.log(`リッチメニュー（${richMenuId}）を全ユーザーに適用しました`);
}
