import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Linking,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { CreditCard, X, Check, ExternalLink, Copy } from 'lucide-react-native';
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme';
import { Button } from '../common';
import { EventPaymentMethod } from '../../types';

interface PaymentReportModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (note: string, paymentMethodId?: string) => Promise<void>;
  paymentAmount: number;
  paymentMethods: EventPaymentMethod[];
  // Legacy support
  legacyPaymentMethod?: string | null;
  legacyPaymentLink?: string | null;
}

const PAYMENT_TYPE_ICONS: Record<string, string> = {
  paypay: '💰',
  bank: '🏦',
  other: '📝',
};

export const PaymentReportModal: React.FC<PaymentReportModalProps> = ({
  visible,
  onClose,
  onSubmit,
  paymentAmount,
  paymentMethods,
  legacyPaymentMethod,
  legacyPaymentLink,
}) => {
  const [note, setNote] = useState('');
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Auto-select if only one method
  useEffect(() => {
    if (paymentMethods.length === 1) {
      setSelectedMethodId(paymentMethods[0].id);
    } else if (paymentMethods.length === 0 && legacyPaymentLink) {
      // Legacy mode - use null as selected
      setSelectedMethodId(null);
    }
  }, [paymentMethods, legacyPaymentLink]);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      await onSubmit(note.trim(), selectedMethodId || undefined);
      setNote('');
      setSelectedMethodId(null);
      onClose();
    } catch {
      // エラーは呼び出し元で処理
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setNote('');
    setSelectedMethodId(null);
    onClose();
  };

  const handleOpenPaymentLink = (url: string) => {
    if (url.startsWith('http')) {
      Linking.openURL(url);
    }
  };

  const handleCopyValue = async (value: string, id: string) => {
    try {
      await Clipboard.setStringAsync(value);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // エラーを無視
    }
  };

  const selectedMethod = selectedMethodId
    ? paymentMethods.find((m) => m.id === selectedMethodId)
    : null;

  const hasPaymentMethods = paymentMethods.length > 0 || legacyPaymentLink;

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

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.amountContainer}>
              <Text style={styles.amountLabel}>支払い金額</Text>
              <Text style={styles.amountValue}>¥{paymentAmount.toLocaleString()}</Text>
            </View>

            {/* Payment Method Selection */}
            {hasPaymentMethods && (
              <View style={styles.methodsSection}>
                <Text style={styles.sectionTitle}>
                  {paymentMethods.length > 1 ? '支払い方法を選択' : '支払い方法'}
                </Text>

                {paymentMethods.map((method) => {
                  const isSelected = selectedMethodId === method.id;
                  const isCopied = copiedId === method.id;
                  const isPayPayLink = method.type === 'paypay' && method.value.startsWith('http');

                  return (
                    <TouchableOpacity
                      key={method.id}
                      style={[
                        styles.methodCard,
                        isSelected && styles.methodCardSelected,
                      ]}
                      onPress={() => setSelectedMethodId(method.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.methodHeader}>
                        <View style={styles.methodTitleRow}>
                          <Text style={styles.methodIcon}>
                            {PAYMENT_TYPE_ICONS[method.type] || '📝'}
                          </Text>
                          <Text style={styles.methodLabel}>{method.label}</Text>
                          {isSelected && (
                            <View style={styles.selectedBadge}>
                              <Check size={14} color={colors.white} />
                            </View>
                          )}
                        </View>
                      </View>

                      {/* Show value details */}
                      <View style={styles.methodValue}>
                        {isPayPayLink ? (
                          <TouchableOpacity
                            style={styles.paymentLinkButton}
                            onPress={() => handleOpenPaymentLink(method.value)}
                          >
                            <Text style={styles.paymentLinkText} numberOfLines={1}>
                              タップして支払いページを開く
                            </Text>
                            <ExternalLink size={16} color={colors.primary} />
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.valueContainer}>
                            <Text style={styles.valueText} numberOfLines={3}>
                              {method.value}
                            </Text>
                            <TouchableOpacity
                              style={styles.copyButton}
                              onPress={() => handleCopyValue(method.value, method.id)}
                            >
                              {isCopied ? (
                                <Check size={16} color={colors.success} />
                              ) : (
                                <Copy size={16} color={colors.gray[500]} />
                              )}
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}

                {/* Legacy support: show old payment_link if no new methods */}
                {paymentMethods.length === 0 && legacyPaymentLink && (
                  <View style={[styles.methodCard, styles.methodCardSelected]}>
                    <View style={styles.methodHeader}>
                      <View style={styles.methodTitleRow}>
                        <Text style={styles.methodIcon}>💰</Text>
                        <Text style={styles.methodLabel}>
                          {legacyPaymentMethod || '支払い方法'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.methodValue}>
                      {legacyPaymentLink.startsWith('http') ? (
                        <TouchableOpacity
                          style={styles.paymentLinkButton}
                          onPress={() => handleOpenPaymentLink(legacyPaymentLink)}
                        >
                          <Text style={styles.paymentLinkText} numberOfLines={1}>
                            タップして支払いページを開く
                          </Text>
                          <ExternalLink size={16} color={colors.primary} />
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.valueContainer}>
                          <Text style={styles.valueText} numberOfLines={3}>
                            {legacyPaymentLink}
                          </Text>
                          <TouchableOpacity
                            style={styles.copyButton}
                            onPress={() => handleCopyValue(legacyPaymentLink, 'legacy')}
                          >
                            {copiedId === 'legacy' ? (
                              <Check size={16} color={colors.success} />
                            ) : (
                              <Copy size={16} color={colors.gray[500]} />
                            )}
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                )}
              </View>
            )}

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
          </ScrollView>

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
              disabled={paymentMethods.length > 1 && !selectedMethodId}
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
    maxHeight: '85%',
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
  scrollView: {
    maxHeight: 400,
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
  methodsSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.gray[700],
    marginBottom: spacing.sm,
  },
  methodCard: {
    borderWidth: 2,
    borderColor: colors.gray[200],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.white,
  },
  methodCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  methodHeader: {
    marginBottom: spacing.xs,
  },
  methodTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  methodIcon: {
    fontSize: 20,
    marginRight: spacing.xs,
  },
  methodLabel: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.gray[900],
  },
  selectedBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  methodValue: {
    marginTop: spacing.xs,
  },
  paymentLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  paymentLinkText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: '500',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  valueText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.gray[700],
    lineHeight: 20,
  },
  copyButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
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
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  cancelButton: {
    flex: 1,
  },
  confirmButton: {
    flex: 1,
  },
});
