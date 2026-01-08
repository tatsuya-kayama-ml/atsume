/**
 * 日付フォーマットユーティリティ
 * 複数画面で重複していた日付フォーマット処理を統一
 */

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

export interface FormattedDateTime {
  date: string;
  time: string;
  isToday: boolean;
  isTomorrow: boolean;
  fullDate: string;
  shortDate: string;
}

/**
 * ISO日付文字列をフォーマット済みオブジェクトに変換
 */
export const formatDateTime = (dateString: string): FormattedDateTime => {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = date.toDateString() === today.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const weekday = WEEKDAYS[date.getDay()];
  const year = date.getFullYear();

  return {
    date: isToday ? '今日' : isTomorrow ? '明日' : `${month}/${day}(${weekday})`,
    time: `${hours}:${minutes}`,
    isToday,
    isTomorrow,
    fullDate: `${year}年${month}月${day}日(${weekday})`,
    shortDate: `${month}/${day}`,
  };
};

/**
 * 日付をYYYY-MM-DD形式の文字列に変換
 */
export const formatDateToISO = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * 時刻をHH:mm形式の文字列に変換
 */
export const formatTimeToString = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

/**
 * 日付を日本語のロングフォーマットに変換
 */
export const formatDateLong = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekday = WEEKDAYS[d.getDay()];
  return `${year}年${month}月${day}日(${weekday})`;
};

/**
 * 相対的な日付表示（今日、明日、X日後など）
 */
export const formatRelativeDate = (dateString: string): string => {
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  const diffTime = date.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return '今日';
  if (diffDays === 1) return '明日';
  if (diffDays === -1) return '昨日';
  if (diffDays > 0 && diffDays <= 7) return `${diffDays}日後`;
  if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)}日前`;

  return formatDateLong(date);
};

/**
 * 通知用の日付フォーマット
 */
export const formatNotificationDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffTime / (1000 * 60));
  const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'たった今';
  if (diffMinutes < 60) return `${diffMinutes}分前`;
  if (diffHours < 24) return `${diffHours}時間前`;
  if (diffDays < 7) return `${diffDays}日前`;

  return formatDateLong(date);
};
