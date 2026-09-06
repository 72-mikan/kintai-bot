const SETTINGS_SHEET_NAME = '基本設定';

function getSpreadsheetId(): string {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('Script Property "SPREADSHEET_ID" が設定されていません');
  return id;
}

function getSpreadsheet(): GoogleAppsScript.Spreadsheet.Spreadsheet {
  return SpreadsheetApp.openById(getSpreadsheetId());
}

// ---- 基本設定 ----

function getBasicSettings(): BasicSettings {
  const sheet = getSpreadsheet().getSheetByName(SETTINGS_SHEET_NAME);
  if (!sheet) throw new Error('基本設定シートが見つかりません');
  return {
    startTime: String(sheet.getRange('B1').getValue()) || '09:00',
    endTime:   String(sheet.getRange('B2').getValue()) || '18:00',
    breakTime: String(sheet.getRange('B3').getValue()) || '1:00',
  };
}

function saveBasicSettings(settings: BasicSettings): void {
  const sheet = getSpreadsheet().getSheetByName(SETTINGS_SHEET_NAME);
  if (!sheet) throw new Error('基本設定シートが見つかりません');
  // B1:B3 が過去に時刻として自動変換され「時刻」書式のまま残っていると、
  // 文字列を書き込んでも書式側で再解釈され壊れるため、書き込み前にテキスト書式へ固定する。
  // このシートの値は自動登録・プリフィルの初期値としてのみ使われるため、
  // 月別シートと異なり保存用の数値文字列 ("900") への変換は行わない（PR #12 レビュー対応）
  sheet.getRange('B1:B3').setNumberFormat('@');
  sheet.getRange('B1').setValue(settings.startTime);
  sheet.getRange('B2').setValue(settings.endTime);
  sheet.getRange('B3').setValue(settings.breakTime);
}

// ---- 月別シート管理 ----

function getMonthSheetName(year: number, month: number): string {
  return `${year}/${String(month).padStart(2, '0')}`;
}

function getOrCreateMonthSheet(year: number, month: number): GoogleAppsScript.Spreadsheet.Sheet {
  const ss = getSpreadsheet();
  const name = getMonthSheetName(year, month);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    initializeMonthSheet(sheet, year, month);
  }
  return sheet;
}

function initializeMonthSheet(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  year: number,
  month: number
): void {
  const headers = [['日付', '曜日', '開始時間', '終了時間', '作業内容', '休憩時間', '実働時間']];
  const headerRange = sheet.getRange(1, 1, 1, 7);
  headerRange.setValues(headers);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4CAF50');
  headerRange.setFontColor('#FFFFFF');

  const days = getDaysInMonth(year, month);
  // A列（日付）・C〜G列（開始時間・終了時間・作業内容・休憩時間・実働時間）は
  // 文字列として保持したいため、スプレッドシート側の自動日付・時刻変換を防ぐ書式に固定する
  sheet.getRange(2, 1, days, 1).setNumberFormat('@');
  sheet.getRange(2, 3, days, 5).setNumberFormat('@');
  const rows: string[][] = [];
  for (let d = 1; d <= days; d++) {
    const date = new Date(year, month - 1, d);
    const dateStr = `${year}/${String(month).padStart(2, '0')}/${String(d).padStart(2, '0')}`;
    rows.push([dateStr, getDayName(date), '', '', '', '', '']);
  }
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 7).setValues(rows);
  }
  // 土日の行に背景色
  for (let d = 1; d <= days; d++) {
    const date = new Date(year, month - 1, d);
    const row = d + 1;
    if (date.getDay() === 0) {
      sheet.getRange(row, 1, 1, 7).setBackground('#FFEBEE');
    } else if (date.getDay() === 6) {
      sheet.getRange(row, 1, 1, 7).setBackground('#E3F2FD');
    }
  }
}

// 指定日付の行番号を返す（1始まり）、見つからない場合 -1
function findDateRow(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  dateStr: string
): number {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (cellValueToDateStr(data[i][0]) === dateStr) return i + 1;
  }
  return -1;
}

// ---- 勤怠レコード ----

// dateStr: "YYYY/MM/DD" or "YYYY-MM-DD"
function getAttendance(dateStr: string): AttendanceRecord | null {
  const normalized = normalizeDateStr(dateStr);
  const date = parseDate(normalized);
  const sheet = getSpreadsheet().getSheetByName(
    getMonthSheetName(date.getFullYear(), date.getMonth() + 1)
  );
  if (!sheet) return null;

  const row = findDateRow(sheet, normalized);
  if (row === -1) return null;

  const vals = sheet.getRange(row, 1, 1, 7).getValues()[0];
  if (!vals[2]) return null; // 開始時間なし = 未登録

  return {
    date:        cellValueToDateStr(vals[0]),
    dayOfWeek:   String(vals[1]),
    startTime:   storageStrToTime(vals[2]),
    endTime:     storageStrToTime(vals[3]),
    workContent: String(vals[4]),
    breakTime:   storageStrToTime(vals[5]),
    workingTime: cellValueToWorkingTimeStr(vals[6]),
  };
}

function saveAttendance(record: AttendanceRecord): void {
  const normalized = normalizeDateStr(record.date);
  const date = parseDate(normalized);
  const sheet = getOrCreateMonthSheet(date.getFullYear(), date.getMonth() + 1);

  const working = calculateWorkingTime(record.startTime, record.endTime, record.breakTime);
  const row = [
    normalized,
    record.dayOfWeek || getDayName(date),
    timeToStorageStr(record.startTime),
    timeToStorageStr(record.endTime),
    record.workContent,
    timeToStorageStr(record.breakTime),
    working,
  ];

  let rowNum = findDateRow(sheet, normalized);
  if (rowNum === -1) {
    rowNum = sheet.getLastRow() + 1;
  }
  // C〜G列が過去に時刻として自動変換され書式が残っている可能性があるため、
  // 書き込み前にテキスト書式へ固定する（issue #10）
  sheet.getRange(rowNum, 3, 1, 5).setNumberFormat('@');
  sheet.getRange(rowNum, 1, 1, 7).setValues([row]);
}

function getMonthlyAttendance(year: number, month: number): AttendanceRecord[] {
  const sheet = getSpreadsheet().getSheetByName(getMonthSheetName(year, month));
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  const records: AttendanceRecord[] = [];
  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    records.push({
      date:        cellValueToDateStr(r[0]),
      dayOfWeek:   String(r[1]),
      startTime:   storageStrToTime(r[2]),
      endTime:     storageStrToTime(r[3]),
      workContent: String(r[4]),
      breakTime:   storageStrToTime(r[5]),
      workingTime: cellValueToWorkingTimeStr(r[6]),
    });
  }
  return records;
}

// 今日の勤怠が登録済みかどうか
function hasAttendanceToday(): boolean {
  const today = new Date();
  const record = getAttendance(formatDate(today));
  return record !== null && record.startTime !== '';
}

// スプレッドシート初期化（初回セットアップ時に実行）
function setupSpreadsheet(): void {
  const ss = getSpreadsheet();

  // 基本設定シートの確認・作成
  let settingsSheet = ss.getSheetByName(SETTINGS_SHEET_NAME);
  if (!settingsSheet) {
    settingsSheet = ss.insertSheet(SETTINGS_SHEET_NAME);
  }
  settingsSheet.getRange('B1:B3').setNumberFormat('@');
  const headerRange = settingsSheet.getRange('A1:B3');
  headerRange.setValues([
    ['開始時間', '09:00'],
    ['終了時間', '18:00'],
    ['休憩時間', '1:00'],
  ]);
  settingsSheet.getRange('A1:A3').setFontWeight('bold');

  console.log('スプレッドシートの初期化が完了しました');
}
