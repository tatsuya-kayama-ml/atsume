import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import { X, UserPlus, Check } from 'lucide-react-native';
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme';
import { Button } from '../common';
import { RsvpStatus, PaymentStatus, GenderType, SkillLevelSettings, GenderSettings } from '../../types';
import { logger } from '../../utils';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AddParticipantModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (name: string, options: {
    rsvpStatus: RsvpStatus;
    paymentStatus: PaymentStatus;
    skillLevel?: number;
    gender?: GenderType;
  }) => Promise<void>;
  skillLevelSettings?: SkillLevelSettings | null;
  genderSettings?: GenderSettings | null;
}

const RSVP_OPTIONS: { value: RsvpStatus; label: string; color: string }[] = [
  { value: 'attending', label: '出席予定', color: colors.success },
  { value: 'maybe', label: '未定', color: colors.warning },
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
  const [rsvpStatus, setRsvpStatus] = useState<RsvpStatus>('attending');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('unpaid');
  const [skillLevel, setSkillLevel] = useState<number | undefined>(undefined);
  const [gender, setGender] = useState<GenderType | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  // Swipe-to-dismiss animation
  const translateY = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

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
          tension: 100,
          friction: 20,
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
      setName('');
      setRsvpStatus('attending');
      setPaymentStatus('unpaid');
      setSkillLevel(undefined);
      setGender(undefined);
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
            setName('');
            setRsvpStatus('attending');
            setPaymentStatus('unpaid');
            setSkillLevel(undefined);
            setGender(undefined);
            onClose();
            translateY.setValue(0);
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 20,
          }).start();
        }
      },
    })
  ).current;

  const handleAdd = async () => {
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      await onAdd(name.trim(), {
        rsvpStatus,
        paymentStatus,
        skillLevel,
        gender,
      });
      // Reset form
      setName('');
      setRsvpStatus('attending');
      setPaymentStatus('unpaid');
      setSkillLevel(undefined);
      setGender(undefined);
      onClose();
    } catch (error) {
      logger.error('Failed to add participant:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = closeModal;

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
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleClose}
          />
        </Animated.View>
        <Animated.View style={[styles.container, { transform: [{ translateY }] }]}>
          {/* Swipeable handle area */}
          <View {...panResponder.panHandlers} style={styles.handleArea}>
            <View style={styles.handle} />
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

            {/* RSVP Status */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>出欠状況</Text>
              <View style={styles.optionsRow}>
                {RSVP_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionButton,
                      rsvpStatus === option.value && {
                        backgroundColor: option.color + '15',
                        borderColor: option.color,
                      },
                    ]}
                    onPress={() => setRsvpStatus(option.value)}
                    activeOpacity={0.7}
                  >
                    {rsvpStatus === option.value && (
                      <Check size={14} color={option.color} style={styles.checkIcon} />
                    )}
                    <Text
                      style={[
                        styles.optionText,
                        rsvpStatus === option.value && { color: option.color, fontWeight: '600' },
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
