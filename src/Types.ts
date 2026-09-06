// GAS全体で共有される型定義（importなし・グローバルスコープ）

type BasicSettings = {
  startTime: string;  // "H:MM"
  endTime: string;    // "H:MM"
  breakTime: string;  // "H:MM"
};

type AttendanceRecord = {
  date: string;        // "YYYY/MM/DD"
  dayOfWeek: string;   // "月", "火" ...
  startTime: string;   // "H:MM"（スプレッドシートには "900" 形式で保存される）
  endTime: string;     // "H:MM"（スプレッドシートには "1800" 形式で保存される）
  workContent: string;
  breakTime: string;   // "H:MM"（スプレッドシートには "100" 形式で保存される）
  workingTime: string; // "H:MM"
  isDayOff: boolean;   // 有給等による休み。スプレッドシートのH列に "休み" として保存される
};

type ScriptResult = {
  success: boolean;
  data?: BasicSettings | AttendanceRecord | AttendanceRecord[] | string;
  error?: string;
};

type ClientConfig = {
  liffId: string;
};
