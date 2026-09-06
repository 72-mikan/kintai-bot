const TRIGGER_FUNCTIONS = ['checkAttendance18', 'checkAttendance22', 'autoAttendance'];

// 時間トリガーを登録（初回セットアップ時に GAS エディタから実行）
function setupTriggers(): void {
  // 既存の対象トリガーを削除
  for (const trigger of ScriptApp.getProjectTriggers()) {
    if (TRIGGER_FUNCTIONS.includes(trigger.getHandlerFunction())) {
      ScriptApp.deleteTrigger(trigger);
    }
  }

  ScriptApp.newTrigger('checkAttendance18').timeBased().everyDays(1).atHour(18).create();
  ScriptApp.newTrigger('checkAttendance22').timeBased().everyDays(1).atHour(22).create();
  // 自動登録は翌0時に前日分をチェック
  ScriptApp.newTrigger('autoAttendance').timeBased().everyDays(1).atHour(0).create();

  console.log('トリガーの設定が完了しました');
}

// 18:00 未登録通知
function checkAttendance18(): void {
  const today = new Date();
  if (!isWorkday(today)) return;
  if (hasAttendanceToday()) return;

  const userId = PropertiesService.getScriptProperties().getProperty('LINE_USER_ID');
  if (!userId) return;

  pushMessage(userId, [
    createTextMessage(
      '⏰ 18:00のお知らせ\n\n本日の勤怠がまだ登録されていません。\n忘れずに登録してください！'
    ),
  ]);
}

// 22:00 未登録通知
function checkAttendance22(): void {
  const today = new Date();
  if (!isWorkday(today)) return;
  if (hasAttendanceToday()) return;

  const userId = PropertiesService.getScriptProperties().getProperty('LINE_USER_ID');
  if (!userId) return;

  pushMessage(userId, [
    createTextMessage(
      '⏰ 22:00のお知らせ\n\n本日の勤怠がまだ登録されていません。\n自動登録まであと少しです。'
    ),
  ]);
}

// 0:00 に前日分を自動登録
function autoAttendance(): void {
  // このトリガーは0:00台に起動するので、前日 = 今日の勤怠
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (!isWorkday(yesterday)) return;

  const dateStr = formatDate(yesterday);
  const existing = getAttendance(dateStr);
  if (existing && (existing.startTime || existing.isDayOff)) return; // 登録済み（「休み」登録済みも含む）

  const settings = getBasicSettings();
  const record: AttendanceRecord = {
    date:        dateStr,
    dayOfWeek:   getDayName(yesterday),
    startTime:   settings.startTime,
    endTime:     settings.endTime,
    workContent: '自動登録',
    breakTime:   settings.breakTime,
    workingTime: calculateWorkingTime(settings.startTime, settings.endTime, settings.breakTime),
    isDayOff:    false,
  };

  saveAttendance(record);

  const userId = PropertiesService.getScriptProperties().getProperty('LINE_USER_ID');
  if (!userId) return;

  pushMessage(userId, [
    createTextMessage(
      `📝 ${dateStr}の勤怠を自動登録しました\n\n` +
      `開始: ${record.startTime}\n` +
      `終了: ${record.endTime}\n` +
      `休憩: ${record.breakTime}\n` +
      `実働: ${record.workingTime}`
    ),
  ]);
}
