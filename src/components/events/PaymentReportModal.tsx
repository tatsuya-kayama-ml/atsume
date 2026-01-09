import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { CreditCard, X } from 'lucide-react-native';
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme';
import { Button } from '../common';

interface PaymentReportModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (note: string) => Promise<void>;
  paymentAmount: number;
  paymentMethod?: string | null;
}

export const PaymentReportModal: React.FC<PaymentReportModalProps> = ({
  visible,
  onClose,
  onSubmit,
  paymentAmount,
  paymentMethod,
}) => {
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      await onSubmit(note.trim());
      setNote('');
      onClose();
    } catch {
      // エラーは呼び出し元で処理
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setNote('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <View style={styles.headerIconContainer}>
              <CreditCard size={24} color={colors.primary} />
            </View>
            <Text style={styles.title}>送金を報告</Text>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <X size={24} color={colors.gray[500]} />
            </TouchableOpacity>
          </View>

          <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>支払い金額</Text>
            <Text style={styles.amountValue}>¥{paymentAmount.toLocaleString()}</Text>
            {paymentMethod && (
              <Text style={styles.paymentMethod}>{paymentMethod}</Text>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>メモ（任意）</Text>
            <TextInput
              style={styles.textInput}
              value={note}
              onChangeText={setNote}
              placeholder="例: PayPayで送りました。ユーザー名XXです。"
              placeholderTextColor={colors.gray[400]}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              maxLength={200}
            />
            <Text style={styles.charCount}>{note.length}/200</Text>
          </View>

          <View style={styles.footer}>
            <Button
              title="キャンセル"
              onPress={handleClose}
              variant="outline"
              style={styles.cancelButton}
            />
            <Button
              title="報告する"
              onPress={handleSubmit}
              loading={isLoading}
              style={styles.confirmButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 400,
    ...shadows.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.gray[900],
  },
  closeButton: {
    padding: spacing.xs,
  },
  amountContainer: {
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    marginBottom: spacing.xs,
  },
  amountValue: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: colors.gray[900],
  },
  paymentMethod: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.gray[700],
    marginBottom: spacing.xs,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.gray[900],
    minHeight: 80,
    backgroundColor: colors.white,
  },
  charCount: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[400],
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cancelButton: {
    flex: 1,
  },
  confirmButton: {
    flex: 1,
  },
});
