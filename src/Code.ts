// ---- エントリーポイント ----

// LINE Webhook 受信 / LIFF ページからの API 呼び出し
function doPost(e: GoogleAppsScript.Events.DoPost): GoogleAppsScript.Content.TextOutput {
  if (e.parameter['api'] === '1') {
    return handleApiRequest(e);
  }

  // LINEの署名検証はLambda（プロキシ）側で実施済みの前提。
  // ここではLambda経由のリクエストであることを共有シークレットで確認する（issue #6）
  const proxyToken = e.parameter['proxyToken'] || '';
  const expectedToken = PropertiesService.getScriptProperties().getProperty('PROXY_SHARED_SECRET') || '';
  if (!expectedToken || !timingSafeEqual(proxyToken, expectedToken)) {
    return ContentService.createTextOutput('Unauthorized');
  }

  try {
    const body = e.postData.contents;
    const json = JSON.parse(body);
    for (const event of json.events) {
      try {
        processWebhookEvent(event);
      } catch (err) {
        console.error('イベント処理エラー:', err);
      }
    }
  } catch (err) {
    console.error('doPost エラー:', err);
  }
  return ContentService.createTextOutput('OK');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// LIFF ページ (fetch) から呼び出し可能な関数のみを許可リストで公開
const API_ACTIONS: Record<string, (...args: any[]) => unknown> = {
  getClientConfig,
  saveLineUserId,
  getBasicSettingsForClient,
  saveBasicSettingsFromClient,
  getAttendanceForClient,
  saveAttendanceFromClient,
  getMonthlyAttendanceForClient,
  outputMonthlyReport,
};

function handleApiRequest(e: GoogleAppsScript.Events.DoPost): GoogleAppsScript.Content.TextOutput {
  let result: unknown;
  try {
    const body = JSON.parse(e.postData.contents);
    const action: string = body.action;
    const args: unknown[] = body.args || [];

    const fn = API_ACTIONS[action];
    if (!fn) {
      result = { success: false, error: 'Unknown action: ' + action };
    } else {
      const r = fn(...args);
      result = r === undefined ? { success: true } : r;
    }
  } catch (err) {
    result = { success: false, error: String(err) };
  }
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// LIFF ページ配信
function doGet(e: GoogleAppsScript.Events.DoGet): GoogleAppsScript.HTML.HtmlOutput {
  const page = e.parameter['page'] || 'menu';
  const fileMap: Record<string, string> = {
    settings: 'Settings',
    input:    'Input',
    output:   'Output',
  };
  const titleMap: Record<string, string> = {
    settings: '基本設定',
    input:    '勤怠入力',
    output:   '勤怠表の出力',
  };

  const fileName = fileMap[page] || 'Input';
  const title = titleMap[page] || '勤怠入力';

  // createTemplateFromFile でスクリプトレット（<?= ?>）を有効化
  const template = HtmlService.createTemplateFromFile(fileName);
  template.execUrl = ScriptApp.getService().getUrl();
  return template.evaluate()
    .setTitle(title)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ---- クライアント向け公開関数（google.script.run から呼び出し） ----

function getClientConfig(page: string): ClientConfig {
  const propKey: Record<string, string> = {
    settings: 'LIFF_ID_SETTINGS',
    input:    'LIFF_ID_INPUT',
    output:   'LIFF_ID_OUTPUT',
  };
  const key = propKey[page] || 'LIFF_ID_INPUT';
  return {
    liffId: PropertiesService.getScriptProperties().getProperty(key) || '',
  };
}

function saveLineUserId(userId: string): void {
  if (userId) {
    PropertiesService.getScriptProperties().setProperty('LINE_USER_ID', userId);
  }
}

function getBasicSettingsForClient(): ScriptResult {
  try {
    return { success: true, data: getBasicSettings() };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

function saveBasicSettingsFromClient(settings: BasicSettings): ScriptResult {
  try {
    saveBasicSettings(settings);
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// 指定日付の勤怠を取得。未登録の場合は基本設定のデフォルト値を返す
function getAttendanceForClient(dateStr: string): ScriptResult {
  try {
    const record = getAttendance(dateStr);
    if (record && record.startTime) {
      return { success: true, data: record };
    }
    // 未登録 → 基本設定のデフォルト値
    const settings = getBasicSettings();
    const date = parseDate(dateStr);
    const defaultRecord: AttendanceRecord = {
      date:        normalizeDateStr(dateStr),
      dayOfWeek:   getDayName(date),
      startTime:   settings.startTime,
      endTime:     settings.endTime,
      workContent: '',
      breakTime:   settings.breakTime,
      workingTime: '',
    };
    return { success: true, data: defaultRecord };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

function saveAttendanceFromClient(record: AttendanceRecord): ScriptResult {
  try {
    saveAttendance(record);
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

function getMonthlyAttendanceForClient(year: number, month: number): ScriptResult {
  try {
    const records = getMonthlyAttendance(year, month);
    return { success: true, data: records };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// 月次レポートをLINEに送信してフォーマット済みテキストも返す
function outputMonthlyReport(year: number, month: number): ScriptResult {
  try {
    const records = getMonthlyAttendance(year, month);
    if (records.length === 0) {
      return { success: false, error: `${year}年${month}月のデータがありません` };
    }

    const report = formatAttendanceReport(year, month, records);

    const userId = PropertiesService.getScriptProperties().getProperty('LINE_USER_ID');
    if (!userId) return { success: false, error: 'LINE User ID が未設定です' };

    // 5000文字超の場合は分割送信
    const chunks: string[] = [];
    for (let i = 0; i < report.length; i += 4900) {
      chunks.push(report.slice(i, i + 4900));
    }
    const messages = chunks.slice(0, 5).map(createTextMessage);
    pushMessage(userId, messages);

    return { success: true, data: report };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// ---- 初回セットアップ（GAS エディタから手動実行） ----

function initializeSystem(): void {
  setupSpreadsheet();
  setupTriggers();
  console.log('=== システムの初期化が完了しました ===');
  console.log('次のステップ:');
  console.log('1. LIFF_ID を設定後、setupRichMenu() を実行してください');
  console.log('2. LINE Developer Console でリッチメニュー画像をアップロードしてください');
}
