import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  PanResponder,
  Animated,
  Dimensions,
} from 'react-native';
import { X, User, Check, Trash2, Edit3 } from 'lucide-react-native';
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme';
import { Button, Avatar, Badge } from '../common';
import { AttendanceStatus, PaymentStatus, GenderType, SkillLevelSettings, GenderSettings, EventParticipant } from '../../types';
import { confirmAlert } from '../../utils/alert';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ParticipantDetailModalProps {
  visible: boolean;
  onClose: () => void;
  participant: EventParticipant | null;
  isOrganizer: boolean;
  skillLevelSettings?: SkillLevelSettings | null;
  genderSettings?: GenderSettings | null;
  onUpdate: (participantId: string, data: {
    display_name?: string;
    attendance_status?: AttendanceStatus;
    payment_status?: PaymentStatus;
    skill_level?: number;
    gender?: GenderType;
  }) => Promise<void>;
  onRemove: (participantId: string) => Promise<void>;
  onCheckIn?: (participantId: string, attended: boolean | null) => Promise<void>;
}

const ATTENDANCE_OPTIONS: { value: AttendanceStatus; label: string; color: string }[] = [
  { value: 'attending', label: '出席', color: colors.success },
  { value: 'maybe', label: '未定', color: colors.warning },
  { value: 'not_attending', label: '欠席', color: colors.error },
  { value: 'pending', label: '未回答', color: colors.gray[500] },
];

const PAYMENT_OPTIONS: { value: PaymentStatus; label: string }[] = [
  { value: 'paid', label: '支払済' },
  { value: 'pending_confirmation', label: '確認待ち' },
  { value: 'unpaid', label: '未払い' },
];

const ACTUAL_ATTENDANCE_OPTIONS: { value: boolean | null; label: string; color: string }[] = [
  { value: true, label: '出席', color: colors.success },
  { value: false, label: '欠席', color: colors.error },
  { value: null, label: '未確認', color: colors.gray[500] },
];

export const ParticipantDetailModal: React.FC<ParticipantDetailModalProps> = ({
  visible,
  onClose,
  participant,
  isOrganizer,
  skillLevelSettings,
  genderSettings,
  onUpdate,
  onRemove,
  onCheckIn,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Swipe-to-dismiss animation
  const translateY = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Animate modal open
  useEffect(() => {
    if (visible) {
      translateY.setValue(SCREEN_HEIGHT);
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
      ]).start();
    }
  }, [visible]);

  const closeModal = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsEditing(false);
      onClose();
      translateY.setValue(0);
    });
  }, [onClose]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && gestureState.dy > 0;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          Animated.parallel([
            Animated.timing(translateY, {
              toValue: SCREEN_HEIGHT,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(backdropOpacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(() => {
            setIsEditing(false);
            onClose();
            translateY.setValue(0);
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 10,
          }).start();
        }
      },
    })
  ).current;

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editAttendance, setEditAttendance] = useState<AttendanceStatus>('pending');
  const [editPayment, setEditPayment] = useState<PaymentStatus>('unpaid');
  const [editSkillLevel, setEditSkillLevel] = useState<number | undefined>(undefined);
  const [editGender, setEditGender] = useState<GenderType | undefined>(undefined);
  const [editActualAttendance, setEditActualAttendance] = useState<boolean | null>(null);

  // Initialize form when participant changes
  useEffect(() => {
    if (participant) {
      const displayName = participant.display_name || participant.user?.display_name || '';
      setEditName(displayName);
      setEditAttendance(participant.attendance_status);
      setEditPayment(participant.payment_status);
      setEditSkillLevel(participant.skill_level ?? undefined);
      setEditGender(participant.gender ?? undefined);
      setEditActualAttendance(participant.actual_attendance ?? null);
    }
  }, [participant]);

  const isManual = participant?.is_manual || !participant?.user_id;
  const displayName = participant?.display_name || participant?.user?.display_name || '名前未設定';
  const avatarUrl = participant?.user?.avatar_url;

  const handleSave = async () => {
    if (!participant) return;

    setIsLoading(true);
    try {
      const updateData: {
        display_name?: string;
        attendance_status?: AttendanceStatus;
        payment_status?: PaymentStatus;
        skill_level?: number;
        gender?: GenderType;
      } = {
        attendance_status: editAttendance,
        payment_status: editPayment,
      };

      // Only allow name change for manual participants
      if (isManual && editName.trim()) {
        updateData.display_name = editName.trim();
      }

      if (skillLevelSettings?.enabled) {
        updateData.skill_level = editSkillLevel;
      }

      if (genderSettings?.enabled) {
        updateData.gender = editGender;
      }

      await onUpdate(participant.id, updateData);

      // Update actual attendance if changed and onCheckIn is provided
      if (onCheckIn && editActualAttendance !== participant.actual_attendance) {
        await onCheckIn(participant.id, editActualAttendance);
      }

      setIsEditing(false);
    } catch (error) {
      // Error handled by parent
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!participant) return;

    const confirmed = await confirmAlert(
      '参加者を削除',
      `${displayName}をこのイベントから削除しますか？この操作は取り消せません。`,
      '削除',
      'キャンセル'
    );

    if (!confirmed) return;

    setIsLoading(true);
    try {
      await onRemove(participant.id);
      onClose();
    } catch (error) {
      // Error handled by parent
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = closeModal;

  const getAttendanceConfig = (status: AttendanceStatus) => {
    const option = ATTENDANCE_OPTIONS.find(o => o.value === status);
    return option || { label: '不明', color: colors.gray[500] };
  };

  const getPaymentConfig = (status: PaymentStatus) => {
    switch (status) {
      case 'paid':
        return { label: '支払済', color: 'success' as const };
      case 'pending_confirmation':
        return { label: '確認待ち', color: 'warning' as const };
      default:
        return { label: '未払い', color: 'default' as const };
    }
  };

  if (!participant) return null;

  const attendanceConfig = getAttendanceConfig(participant.attendance_status);
  const paymentConfig = getPaymentConfig(participant.payment_status);

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View
          style={[styles.backdrop, { opacity: backdropOpacity }]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleClose}
          />
        </Animated.View>
        <Animated.View
          style={[styles.container, { transform: [{ translateY }] }]}
        >
          {/* Swipeable handle area */}
          <View {...panResponder.panHandlers} style={styles.handleArea}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <Avatar name={displayName} imageUrl={avatarUrl ?? undefined} size="lg" />
              <View style={styles.headerInfo}>
                <Text style={styles.title}>{displayName}</Text>
                <View style={styles.headerBadges}>
                  {isManual && (
                    <Badge label="手動追加" color="default" size="sm" variant="soft" />
                  )}
                </View>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}
                activeOpacity={0.7}
              >
                <X size={24} color={colors.gray[500]} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {!isEditing ? (
              // View Mode
              <>
                {/* Status Overview */}
                <View style={styles.statusOverview}>
                  <View style={styles.statusItem}>
                    <Text style={styles.statusLabel}>出欠状況</Text>
                    <View style={[styles.statusValue, { backgroundColor: attendanceConfig.color + '15' }]}>
                      <Text style={[styles.statusValueText, { color: attendanceConfig.color }]}>
                        {attendanceConfig.label}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.statusItem}>
                    <Text style={styles.statusLabel}>支払い</Text>
                    <Badge
                      label={paymentConfig.label}
                      color={paymentConfig.color}
                      size="md"
                    />
                  </View>
                </View>

                {/* Additional Info */}
                {(skillLevelSettings?.enabled || genderSettings?.enabled) && (
                  <View style={styles.infoSection}>
                    <Text style={styles.sectionTitle}>追加情報</Text>
                    <View style={styles.infoGrid}>
                      {skillLevelSettings?.enabled && (
                        <View style={styles.infoItem}>
                          <Text style={styles.infoLabel}>
                            {skillLevelSettings.label || 'スキルレベル'}
                          </Text>
                          <Text style={styles.infoValue}>
                            {participant.skill_level
                              ? skillLevelSettings.options?.find(o => o.value === participant.skill_level)?.label || '-'
                              : '未設定'}
                          </Text>
                        </View>
                      )}
                      {genderSettings?.enabled && (
                        <View style={styles.infoItem}>
                          <Text style={styles.infoLabel}>性別</Text>
                          <Text style={styles.infoValue}>
                            {participant.gender
                              ? genderSettings.options?.find(o => o.value === participant.gender)?.label || '-'
                              : '未設定'}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* Actual Attendance */}
                <View style={styles.infoSection}>
                  <Text style={styles.sectionTitle}>当日の出席</Text>
                  <Badge
                    label={participant.actual_attendance === true ? '出席' : participant.actual_attendance === false ? '欠席' : '未確認'}
                    color={participant.actual_attendance === true ? 'success' : participant.actual_attendance === false ? 'error' : 'default'}
                    size="md"
                  />
                </View>

                {/* Registered User Info */}
                {!isManual && participant.user && (
                  <View style={styles.infoSection}>
                    <Text style={styles.sectionTitle}>登録情報</Text>
                    <View style={styles.userInfo}>
                      <User size={16} color={colors.gray[400]} />
                      <Text style={styles.userInfoText}>
                        アプリ登録ユーザー
                      </Text>
                    </View>
                  </View>
                )}
              </>
            ) : (
              // Edit Mode
              <>
                {/* Name (Manual Participants Only) */}
                {isManual && (
                  <View style={styles.section}>
                    <Text style={styles.sectionLabel}>名前</Text>
                    <TextInput
                      style={styles.input}
                      value={editName}
                      onChangeText={setEditName}
                      placeholder="名前を入力"
                      placeholderTextColor={colors.gray[400]}
                    />
                  </View>
                )}

                {/* Attendance Status */}
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>出欠状況</Text>
                  <View style={styles.optionsRow}>
                    {ATTENDANCE_OPTIONS.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.optionButton,
                          editAttendance === option.value && {
                            backgroundColor: option.color + '15',
                            borderColor: option.color,
                          },
                        ]}
                        onPress={() => setEditAttendance(option.value)}
                        activeOpacity={0.7}
                      >
                        {editAttendance === option.value && (
                          <Check size={14} color={option.color} style={styles.checkIcon} />
                        )}
                        <Text
                          style={[
                            styles.optionText,
                            editAttendance === option.value && { color: option.color, fontWeight: '600' },
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
                          styles.optionButton,
                          editPayment === option.value && styles.optionButtonActive,
                        ]}
                        onPress={() => setEditPayment(option.value)}
                        activeOpacity={0.7}
                      >
                        {editPayment === option.value && (
                          <Check size={14} color={colors.primary} style={styles.checkIcon} />
                        )}
                        <Text
                          style={[
                            styles.optionText,
                            editPayment === option.value && styles.optionTextActive,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Actual Attendance */}
                {onCheckIn && (
                  <View style={styles.section}>
                    <Text style={styles.sectionLabel}>当日の出席</Text>
                    <View style={styles.optionsRow}>
                      {ACTUAL_ATTENDANCE_OPTIONS.map((option) => (
                        <TouchableOpacity
                          key={String(option.value)}
                          style={[
                            styles.optionButton,
                            editActualAttendance === option.value && {
                              backgroundColor: option.color + '15',
                              borderColor: option.color,
                            },
                          ]}
                          onPress={() => setEditActualAttendance(option.value)}
                          activeOpacity={0.7}
                        >
                          {editActualAttendance === option.value && (
                            <Check size={14} color={option.color} style={styles.checkIcon} />
                          )}
                          <Text
                            style={[
                              styles.optionText,
                              editActualAttendance === option.value && { color: option.color, fontWeight: '600' },
                            ]}
                          >
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Skill Level */}
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
                            editSkillLevel === option.value && styles.optionButtonActive,
                          ]}
                          onPress={() => setEditSkillLevel(option.value)}
                          activeOpacity={0.7}
                        >
                          {editSkillLevel === option.value && (
                            <Check size={14} color={colors.primary} style={styles.checkIcon} />
                          )}
                          <Text
                            style={[
                              styles.optionText,
                              editSkillLevel === option.value && styles.optionTextActive,
                            ]}
                          >
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Gender */}
                {genderSettings?.enabled && genderSettings.options && (
                  <View style={styles.section}>
                    <Text style={styles.sectionLabel}>性別</Text>
                    <View style={styles.optionsRow}>
                      {genderSettings.options.map((option) => (
                        <TouchableOpacity
                          key={option.value}
                          style={[
                            styles.optionButton,
                            editGender === option.value && styles.optionButtonActive,
                          ]}
                          onPress={() => setEditGender(option.value as GenderType)}
                          activeOpacity={0.7}
                        >
                          {editGender === option.value && (
                            <Check size={14} color={colors.primary} style={styles.checkIcon} />
                          )}
                          <Text
                            style={[
                              styles.optionText,
                              editGender === option.value && styles.optionTextActive,
                            ]}
                          >
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </>
            )}
          </ScrollView>

          {/* Footer Actions */}
          {isOrganizer && (
            <View style={styles.footer}>
              {!isEditing ? (
                <>
                  <Button
                    title="編集"
                    variant="outline"
                    onPress={() => setIsEditing(true)}
                    icon={<Edit3 size={16} color={colors.primary} />}
                    style={styles.actionButton}
                  />
                  <Button
                    title="削除"
                    variant="outline"
                    onPress={handleRemove}
                    icon={<Trash2 size={16} color={colors.error} />}
                    style={styles.deleteButton}
                    loading={isLoading}
                  />
                </>
              ) : (
                <>
                  <Button
                    title="キャンセル"
                    variant="outline"
                    onPress={() => setIsEditing(false)}
                    style={styles.actionButton}
                  />
                  <Button
                    title="保存"
                    onPress={handleSave}
                    loading={isLoading}
                    style={styles.actionButton}
                  />
                </>
              )}
            </View>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    maxHeight: '90%',
    ...shadows.lg,
  },
  handleArea: {
    // Swipeable area
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: colors.gray[300],
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  headerInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  headerBadges: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  title: {
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
  // View Mode Styles
  statusOverview: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statusItem: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.lg,
  },
  statusLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[500],
    marginBottom: spacing.xs,
  },
  statusValue: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  statusValueText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  infoSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.gray[700],
    marginBottom: spacing.sm,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  infoItem: {
    backgroundColor: colors.gray[50],
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    minWidth: '45%',
  },
  infoLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[500],
    marginBottom: spacing.xs,
  },
  infoValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.gray[900],
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.lg,
  },
  userInfoText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
  },
  // Edit Mode Styles
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
  // Footer
  footer: {
    flexDirection: 'row',
    padding: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  deleteButton: {
    flex: 1,
    borderColor: colors.error,
  },
});
