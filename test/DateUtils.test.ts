import { describe, it, expect } from 'vitest';
import { loadGasFile } from './gasLoader';

const {
  getDayName,
  formatDate,
  parseDate,
  getDaysInMonth,
  timeToMinutes,
  minutesToTime,
  calculateWorkingTime,
  isWeekend,
  normalizeDateStr,
  cellValueToDateStr,
  cellValueToTimeStr,
  cellValueToWorkingTimeStr,
} = loadGasFile('DateUtils.ts');

describe('getDayName', () => {
  it('日曜日を返す', () => {
    expect(getDayName(new Date(2026, 7, 16))).toBe('日');
  });
  it('月曜日を返す', () => {
    expect(getDayName(new Date(2026, 7, 17))).toBe('月');
  });
});

describe('formatDate', () => {
  it('YYYY/MM/DD 形式（0埋め）で返す', () => {
    expect(formatDate(new Date(2026, 0, 5))).toBe('2026/01/05');
  });
});

describe('parseDate', () => {
  it('スラッシュ区切りをパースできる', () => {
    const d = parseDate('2026/08/16');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7);
    expect(d.getDate()).toBe(16);
  });
  it('ハイフン区切りをパースできる', () => {
    const d = parseDate('2026-08-16');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7);
    expect(d.getDate()).toBe(16);
  });
});

describe('getDaysInMonth', () => {
  it('平年の2月は28日', () => {
    expect(getDaysInMonth(2026, 2)).toBe(28);
  });
  it('31日ある月', () => {
    expect(getDaysInMonth(2026, 8)).toBe(31);
  });
});

describe('timeToMinutes / minutesToTime', () => {
  it('HH:MM を分に変換する', () => {
    expect(timeToMinutes('01:30')).toBe(90);
    expect(timeToMinutes('9:05')).toBe(545);
  });
  it('空文字は0分', () => {
    expect(timeToMinutes('')).toBe(0);
  });
  it('分を H:MM に変換する', () => {
    expect(minutesToTime(90)).toBe('1:30');
    expect(minutesToTime(5)).toBe('0:05');
  });
});

describe('calculateWorkingTime', () => {
  it('休憩を差し引いた実働時間を計算する', () => {
    expect(calculateWorkingTime('09:00', '18:00', '01:00')).toBe('8:00');
  });
  it('実働がマイナスになる場合は 0:00 を返す', () => {
    expect(calculateWorkingTime('18:00', '09:00', '01:00')).toBe('0:00');
  });
});

describe('isWeekend', () => {
  it('土曜日は true', () => {
    expect(isWeekend(new Date(2026, 1, 28))).toBe(true);
  });
  it('平日は false', () => {
    expect(isWeekend(new Date(2026, 7, 17))).toBe(false);
  });
});

describe('normalizeDateStr', () => {
  it('ハイフン区切りをスラッシュ区切りに正規化する', () => {
    expect(normalizeDateStr('2026-8-6')).toBe('2026/08/06');
  });
});

describe('cellValueToDateStr', () => {
  it('Dateオブジェクトを "YYYY/MM/DD" 文字列に変換する', () => {
    expect(cellValueToDateStr(new Date(2026, 7, 3))).toBe('2026/08/03');
  });
  it('文字列はそのまま文字列化して返す', () => {
    expect(cellValueToDateStr('2026/08/03')).toBe('2026/08/03');
  });
});

describe('cellValueToTimeStr', () => {
  it('Dateオブジェクトを "HH:MM" 文字列に変換する', () => {
    expect(cellValueToTimeStr(new Date(1899, 11, 30, 9, 0))).toBe('09:00');
  });
  it('分が1桁でも0埋めする', () => {
    expect(cellValueToTimeStr(new Date(1899, 11, 30, 8, 5))).toBe('08:05');
  });
  it('文字列はそのまま文字列化して返す', () => {
    expect(cellValueToTimeStr('9:00')).toBe('9:00');
  });
  it('空文字はそのまま返す', () => {
    expect(cellValueToTimeStr('')).toBe('');
  });
});

describe('cellValueToWorkingTimeStr', () => {
  it('Dateオブジェクトを "H:MM"（時をゼロ埋めしない）文字列に変換する', () => {
    expect(cellValueToWorkingTimeStr(new Date(1899, 11, 30, 8, 0))).toBe('8:00');
  });
  it('2桁の時もそのまま返す', () => {
    expect(cellValueToWorkingTimeStr(new Date(1899, 11, 30, 12, 30))).toBe('12:30');
  });
  it('文字列はそのまま文字列化して返す', () => {
    expect(cellValueToWorkingTimeStr('8:00')).toBe('8:00');
  });
});
