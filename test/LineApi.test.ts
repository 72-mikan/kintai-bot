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
        workContent: '調査',
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
    expect(report).toContain(' 3日(月) 09:00〜18:00 休01:00 実8:00 調査');
    expect(report).toContain(' 4日(火) ─');
    expect(report).toContain('勤務日数: 1日');
    expect(report).toContain('総稼働時間: 8:00');
  });

  it('作業内容に含まれる改行をスペースに置き換えて1行に収める', () => {
    const records = [
      {
        date: '2026/08/03',
        dayOfWeek: '月',
        startTime: '09:00',
        endTime: '18:00',
        workContent: '設計\n打ち合わせ',
        breakTime: '01:00',
        workingTime: '8:00',
      },
    ];

    const report = formatAttendanceReport(2026, 8, records);

    expect(report).toContain(' 3日(月) 09:00〜18:00 休01:00 実8:00 設計 打ち合わせ\n');
  });

  it('休憩時間が空文字の場合は "休" ラベルが浮かず "─" を表示する', () => {
    const records = [
      {
        date: '2026/08/03',
        dayOfWeek: '月',
        startTime: '09:00',
        endTime: '18:00',
        workContent: '',
        breakTime: '',
        workingTime: '9:00',
      },
    ];

    const report = formatAttendanceReport(2026, 8, records);

    expect(report).toContain(' 3日(月) 09:00〜18:00 休─ 実9:00');
  });

  it('isDayOff が true の日は「休み」と表示し、勤務日数・総稼働時間に含めない', () => {
    const records = [
      {
        date: '2026/08/03',
        dayOfWeek: '月',
        startTime: '09:00',
        endTime: '18:00',
        workContent: '調査',
        breakTime: '01:00',
        workingTime: '8:00',
        isDayOff: false,
      },
      {
        date: '2026/08/04',
        dayOfWeek: '火',
        startTime: '',
        endTime: '',
        workContent: '有給休暇',
        breakTime: '',
        workingTime: '',
        isDayOff: true,
      },
    ];

    const report = formatAttendanceReport(2026, 8, records);

    expect(report).toContain(' 4日(火) 休み　有給休暇');
    expect(report).toContain('勤務日数: 1日');
    expect(report).toContain('総稼働時間: 8:00');
  });
});
