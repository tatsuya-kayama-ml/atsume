/**
 * クロスプラットフォーム対応のアラートユーティリティ
 * Platform.OS === 'web' のチェックを統一
 */

import { Alert, Platform } from 'react-native';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface AlertOptions {
  cancelable?: boolean;
}

/**
 * クロスプラットフォーム対応のアラート表示
 */
export const showAlert = (
  title: string,
  message?: string,
  buttons?: AlertButton[],
  options?: AlertOptions
): void => {
  if (Platform.OS === 'web') {
    // Webの場合
    if (buttons && buttons.length > 1) {
      // 複数ボタンの場合はconfirmを使用
      const confirmed = window.confirm(`${title}\n\n${message || ''}`);
      const button = confirmed
        ? buttons.find(b => b.style !== 'cancel') || buttons[0]
        : buttons.find(b => b.style === 'cancel');
      button?.onPress?.();
    } else {
      // 単一ボタンの場合はalertを使用
      window.alert(message ? `${title}\n\n${message}` : title);
      buttons?.[0]?.onPress?.();
    }
  } else {
    // Native (iOS/Android)
    Alert.alert(title, message, buttons, options);
  }
};

/**
 * 確認ダイアログを表示（Promise版）
 */
export const confirmAlert = (
  title: string,
  message?: string,
  confirmText = 'OK',
  cancelText = 'キャンセル'
): Promise<boolean> => {
  return new Promise(resolve => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(message ? `${title}\n\n${message}` : title);
      resolve(confirmed);
    } else {
      Alert.alert(
        title,
        message,
        [
          { text: cancelText, style: 'cancel', onPress: () => resolve(false) },
          { text: confirmText, onPress: () => resolve(true) },
        ],
        { cancelable: true }
      );
    }
  });
};

/**
 * 削除確認ダイアログ
 */
export const confirmDelete = (
  itemName: string,
  onConfirm: () => void
): void => {
  showAlert(
    '削除の確認',
    `「${itemName}」を削除してもよろしいですか？`,
    [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: onConfirm },
    ]
  );
};

/**
 * 成功メッセージを表示
 */
export const showSuccess = (message: string): void => {
  showAlert('成功', message);
};

/**
 * エラーメッセージを表示
 */
export const showError = (message: string): void => {
  showAlert('エラー', message);
};

/**
 * ネットワークエラーメッセージを表示
 */
export const showNetworkError = (): void => {
  showAlert(
    'ネットワークエラー',
    'インターネット接続を確認してください。'
  );
};
