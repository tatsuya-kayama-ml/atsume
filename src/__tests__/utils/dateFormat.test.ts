// Test for date formatting logic (extracted from EventDetailScreen)

const formatDateTime = (dateString: string): { date: string; time: string; shortDate: string } => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const weekday = weekdays[date.getDay()];
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return {
    date: `${year}年${month}月${day}日(${weekday})`,
    time: `${hours}:${minutes}`,
    shortDate: `${month}/${day}(${weekday})`,
  };
};

describe('Date Formatting', () => {
  describe('formatDateTime', () => {
    it('should format a date string correctly', () => {
      // 2025年1月15日 14:30
      const result = formatDateTime('2025-01-15T14:30:00');

      expect(result.date).toBe('2025年1月15日(水)');
      expect(result.time).toBe('14:30');
      expect(result.shortDate).toBe('1/15(水)');
    });

    it('should pad single digit hours and minutes with zeros', () => {
      // 2025年3月5日 09:05
      const result = formatDateTime('2025-03-05T09:05:00');

      expect(result.date).toBe('2025年3月5日(水)');
      expect(result.time).toBe('09:05');
      expect(result.shortDate).toBe('3/5(水)');
    });

    it('should handle midnight correctly', () => {
      const result = formatDateTime('2025-01-01T00:00:00');

      expect(result.time).toBe('00:00');
    });

    it('should handle end of day correctly', () => {
      const result = formatDateTime('2025-01-01T23:59:00');

      expect(result.time).toBe('23:59');
    });

    it('should format weekdays correctly in Japanese', () => {
      // Test each day of the week
      const dates = [
        { date: '2025-01-05T12:00:00', expected: '日' }, // Sunday
        { date: '2025-01-06T12:00:00', expected: '月' }, // Monday
        { date: '2025-01-07T12:00:00', expected: '火' }, // Tuesday
        { date: '2025-01-08T12:00:00', expected: '水' }, // Wednesday
        { date: '2025-01-09T12:00:00', expected: '木' }, // Thursday
        { date: '2025-01-10T12:00:00', expected: '金' }, // Friday
        { date: '2025-01-11T12:00:00', expected: '土' }, // Saturday
      ];

      dates.forEach(({ date, expected }) => {
        const result = formatDateTime(date);
        expect(result.date).toContain(`(${expected})`);
        expect(result.shortDate).toContain(`(${expected})`);
      });
    });

    it('should handle ISO 8601 date strings', () => {
      const result = formatDateTime('2025-12-25T18:45:00.000Z');

      expect(result.date).toMatch(/2025年12月\d+日\([日月火水木金土]\)/);
      expect(result.time).toMatch(/\d{2}:\d{2}/);
    });

    it('should handle different months correctly', () => {
      const months = [
        { date: '2025-01-15T12:00:00', month: 1 },
        { date: '2025-02-15T12:00:00', month: 2 },
        { date: '2025-12-15T12:00:00', month: 12 },
      ];

      months.forEach(({ date, month }) => {
        const result = formatDateTime(date);
        expect(result.date).toContain(`${month}月`);
        expect(result.shortDate).toContain(`${month}/`);
      });
    });

    it('should return all three format types', () => {
      const result = formatDateTime('2025-06-15T10:30:00');

      expect(result).toHaveProperty('date');
      expect(result).toHaveProperty('time');
      expect(result).toHaveProperty('shortDate');
      expect(typeof result.date).toBe('string');
      expect(typeof result.time).toBe('string');
      expect(typeof result.shortDate).toBe('string');
    });
  });
});
