// GAS全体で共有される型定義（importなし・グローバルスコープ）

type BasicSettings = {
  startTime: string;  // "HH:MM"
  endTime: string;    // "HH:MM"
  breakTime: string;  // "HH:MM"
};

type AttendanceRecord = {
  date: string;        // "YYYY/MM/DD"
  dayOfWeek: string;   // "月", "火" ...
  startTime: string;   // "HH:MM"
  endTime: string;     // "HH:MM"
  workContent: string;
  breakTime: string;   // "HH:MM"
  workingTime: string; // "H:MM"
};

type ScriptResult = {
  success: boolean;
  data?: BasicSettings | AttendanceRecord | AttendanceRecord[] | string;
  error?: string;
};

type ClientConfig = {
  liffId: string;
};
