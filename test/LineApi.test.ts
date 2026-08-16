import { describe, it, expect } from 'vitest';
import { loadGasFiles } from './gasLoader';

// formatAttendanceReport は DateUtils.ts の関数に依存するため同じスコープで読み込む
const { createTextMessage, formatAttendanceReport } = loadGasFiles([
  'DateUtils.ts',
  'LineApi.ts',
]);

describe('createTextMessage', () => {
  it('LINEのテキストメッセージ形式を返す', () => {
    expect(createTextMessage('こんにちは')).toEqual({ type: 'text', text: 'こんにちは' });
  });
});

describe('formatAttendanceReport', () => {
  it('勤務日を集計してレポート文字列を生成する', () => {
    const records = [
      {
        date: '2026/08/03',
        dayOfWeek: '月',
        startTime: '09:00',
        endTime: '18:00',
        workContent: '',
        breakTime: '01:00',
        workingTime: '8:00',
      },
      {
        date: '2026/08/04',
        dayOfWeek: '火',
        startTime: '',
        endTime: '',
        workContent: '',
        breakTime: '',
        workingTime: '',
      },
    ];

    const report = formatAttendanceReport(2026, 8, records);

    expect(report).toContain('【2026年8月 勤怠表】');
    expect(report).toContain(' 3日(月) 09:00〜18:00 実8:00');
    expect(report).toContain(' 4日(火) ─');
    expect(report).toContain('勤務日数: 1日');
    expect(report).toContain('総稼働時間: 8:00');
  });
});
