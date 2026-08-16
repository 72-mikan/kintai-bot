const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];

function getDayName(date: Date): string {
  return DAY_NAMES[date.getDay()];
}

// "YYYY/MM/DD" 形式を返す
function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}/${m}/${d}`;
}

// "YYYY/MM/DD" or "YYYY-MM-DD" → Date
function parseDate(dateStr: string): Date {
  const normalized = dateStr.replace(/\//g, '-');
  const [y, m, d] = normalized.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// "HH:MM" の時刻文字列をminutes数値に変換
function timeToMinutes(time: string): number {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

// minutes数値を "H:MM" 形式に変換
function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

// 実働時間を算出: (終了 - 開始) - 休憩
function calculateWorkingTime(startTime: string, endTime: string, breakTime: string): string {
  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);
  const breakMin = timeToMinutes(breakTime);
  const working = endMin - startMin - breakMin;
  return working > 0 ? minutesToTime(working) : '0:00';
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

// Google カレンダー（日本の祝日）で祝日チェック
function isHoliday(date: Date): boolean {
  try {
    const calendar = CalendarApp.getCalendarById(
      'ja.japanese#holiday@group.v.calendar.google.com'
    );
    if (!calendar) return false;
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    return calendar.getEvents(start, end).length > 0;
  } catch {
    return false;
  }
}

function isWorkday(date: Date): boolean {
  return !isWeekend(date) && !isHoliday(date);
}

// 日付文字列を "YYYY/MM/DD" に正規化
function normalizeDateStr(dateStr: string): string {
  const date = parseDate(dateStr);
  return formatDate(date);
}

// スプレッドシートのセル値（Dateオブジェクトに自動変換されている場合がある）を "YYYY/MM/DD" 文字列に変換
function cellValueToDateStr(value: unknown): string {
  if (isDateValue(value)) return formatDate(value);
  return String(value);
}

// vm等の別レルムをまたいでも判定できるよう instanceof ではなくダックタイピングで判定する
function isDateValue(value: unknown): value is Date {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { getFullYear?: unknown }).getFullYear === 'function'
  );
}
