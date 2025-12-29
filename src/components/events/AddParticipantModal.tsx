import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { X, UserPlus, Check } from 'lucide-react-native';
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme';
import { Button } from '../common';
import { AttendanceStatus, PaymentStatus, GenderType, SkillLevelSettings, GenderSettings } from '../../types';

interface AddParticipantModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (name: string, options: {
    attendanceStatus: AttendanceStatus;
    paymentStatus: PaymentStatus;
    skillLevel?: number;
    gender?: GenderType;
  }) => Promise<void>;
  skillLevelSettings?: SkillLevelSettings | null;
  genderSettings?: GenderSettings | null;
}

const ATTENDANCE_OPTIONS: { value: AttendanceStatus; label: string; color: string }[] = [
  { value: 'attending', label: '出席', color: colors.success },
  { value: 'maybe', label: '未定', color: colors.warning },
  { value: 'not_attending', label: '欠席', color: colors.error },
  { value: 'pending', label: '未回答', color: colors.gray[500] },
];

const PAYMENT_OPTIONS: { value: PaymentStatus; label: string }[] = [
  { value: 'paid', label: '支払済' },
  { value: 'unpaid', label: '未払い' },
];

export const AddParticipantModal: React.FC<AddParticipantModalProps> = ({
  visible,
  onClose,
  onAdd,
  skillLevelSettings,
  genderSettings,
}) => {
  const [name, setName] = useState('');
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus>('attending');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('unpaid');
  const [skillLevel, setSkillLevel] = useState<number | undefined>(undefined);
  const [gender, setGender] = useState<GenderType | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      await onAdd(name.trim(), {
        attendanceStatus,
        paymentStatus,
        skillLevel,
        gender,
      });
      // Reset form
      setName('');
      setAttendanceStatus('attending');
      setPaymentStatus('unpaid');
      setSkillLevel(undefined);
      setGender(undefined);
      onClose();
    } catch (error) {
      console.error('Failed to add participant:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setAttendanceStatus('attending');
    setPaymentStatus('unpaid');
    setSkillLevel(undefined);
    setGender(undefined);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <UserPlus size={20} color={colors.primary} />
            </View>
            <Text style={styles.title}>参加者を追加</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <X size={24} color={colors.gray[500]} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Name Input */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>名前 *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="参加者の名前を入力"
                placeholderTextColor={colors.gray[400]}
                autoFocus
              />
            </View>

            {/* Attendance Status */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>出欠状況</Text>
              <View style={styles.optionsRow}>
                {ATTENDANCE_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionButton,
                      attendanceStatus === option.value && {
                        backgroundColor: option.color + '15',
                        borderColor: option.color,
                      },
                    ]}
                    onPress={() => setAttendanceStatus(option.value)}
                    activeOpacity={0.7}
                  >
                    {attendanceStatus === option.value && (
                      <Check size={14} color={option.color} style={styles.checkIcon} />
                    )}
                    <Text
                      style={[
                        styles.optionText,
                        attendanceStatus === option.value && { color: option.color, fontWeight: '600' },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Payment Status */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>支払い状況</Text>
              <View style={styles.optionsRow}>
                {PAYMENT_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionButtonWide,
                      paymentStatus === option.value && styles.optionButtonActive,
                    ]}
                    onPress={() => setPaymentStatus(option.value)}
                    activeOpacity={0.7}
                  >
                    {paymentStatus === option.value && (
                      <Check size={14} color={colors.primary} style={styles.checkIcon} />
                    )}
                    <Text
                      style={[
                        styles.optionText,
                        paymentStatus === option.value && styles.optionTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Skill Level (if enabled) */}
            {skillLevelSettings?.enabled && skillLevelSettings.options && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>
                  {skillLevelSettings.label || 'スキルレベル'}
                </Text>
                <View style={styles.optionsRow}>
                  {skillLevelSettings.options.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.optionButton,
                        skillLevel === option.value && styles.optionButtonActive,
                      ]}
                      onPress={() => setSkillLevel(option.value)}
                      activeOpacity={0.7}
                    >
                      {skillLevel === option.value && (
                        <Check size={14} color={colors.primary} style={styles.checkIcon} />
                      )}
                      <Text
                        style={[
                          styles.optionText,
                          skillLevel === option.value && styles.optionTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Gender (if enabled) */}
            {genderSettings?.enabled && genderSettings.options && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>性別</Text>
                <View style={styles.optionsRow}>
                  {genderSettings.options.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.optionButton,
                        gender === option.value && styles.optionButtonActive,
                      ]}
                      onPress={() => setGender(option.value as GenderType)}
                      activeOpacity={0.7}
                    >
                      {gender === option.value && (
                        <Check size={14} color={colors.primary} style={styles.checkIcon} />
                      )}
                      <Text
                        style={[
                          styles.optionText,
                          gender === option.value && styles.optionTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.hint}>
              <Text style={styles.hintText}>
                手動で追加された参加者はアプリにログインしていないユーザーとして登録されます
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Button
              title="キャンセル"
              variant="outline"
              onPress={handleClose}
              style={styles.cancelButton}
            />
            <Button
              title="追加"
              onPress={handleAdd}
              loading={isLoading}
              disabled={!name.trim()}
              style={styles.addButton}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    maxHeight: '90%',
    ...shadows.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
  content: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.gray[700],
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.gray[50],
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.gray[900],
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.gray[50],
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  optionButtonWide: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.gray[50],
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  optionButtonActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  optionText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
  },
  optionTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  checkIcon: {
    marginRight: spacing.xs,
  },
  hint: {
    backgroundColor: colors.gray[50],
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.sm,
  },
  hintText: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[500],
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
    gap: spacing.sm,
  },
  cancelButton: {
    flex: 1,
  },
  addButton: {
    flex: 1,
  },
});
