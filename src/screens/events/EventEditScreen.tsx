import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { FileText, Calendar, MapPin, BarChart3 } from 'lucide-react-native';
import { Button, Input, Card, DateTimePicker } from '../../components/common';
import { useEventStore } from '../../stores/eventStore';
import { colors, spacing, typography, borderRadius } from '../../constants/theme';
import { RootStackParamList, SkillLevelOption, SkillLevelSettings, GenderOption, GenderSettings } from '../../types';
import { logger } from '../../utils';

const DEFAULT_SKILL_LEVEL_OPTIONS: SkillLevelOption[] = [
  { value: 1, label: '初心者' },
  { value: 2, label: '少しだけ経験者' },
  { value: 3, label: 'がっつり経験者' },
];

const ADDITIONAL_SKILL_OPTIONS: SkillLevelOption[] = [
  { value: 4, label: '上級者' },
  { value: 5, label: 'エキスパート' },
];

const MIN_SKILL_OPTIONS = 1;
const MAX_SKILL_OPTIONS = 5;

const DEFAULT_GENDER_OPTIONS: GenderOption[] = [
  { value: 'male', label: '男性' },
  { value: 'female', label: '女性' },
];

const eventSchema = z.object({
  name: z
    .string()
    .min(1, 'イベント名を入力してください')
    .max(20, 'イベント名は20文字以内で入力してください'),
  description: z.string().max(200, '説明は200文字以内で入力してください').optional(),
  location: z.string().min(1, '場所を入力してください').max(30, '場所は30文字以内で入力してください'),
  fee: z
    .string()
    .optional()
    .refine((val) => !val || /^\d+$/.test(val), '数値を入力してください'),
  capacity: z.string().regex(/^\d*$/, '数値を入力してください').optional(),
});

type EventFormData = z.infer<typeof eventSchema>;

interface Props {
  navigation: NativeStackNavigationProp<RootStackParamList, 'EventEdit'>;
  route: RouteProp<RootStackParamList, 'EventEdit'>;
}

export const EventEditScreen: React.FC<Props> = ({ navigation, route }) => {
  const { eventId } = route.params;
  const { currentEvent, fetchEventById, updateEvent, isLoading } = useEventStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // スキルレベル設定の状態
  const [skillLevelEnabled, setSkillLevelEnabled] = useState(false);
  const [showSkillLevelDetails, setShowSkillLevelDetails] = useState(false);
  const [skillLevelLabel, setSkillLevelLabel] = useState('スキルレベル');
  const [skillLevelOptions, setSkillLevelOptions] = useState<SkillLevelOption[]>(DEFAULT_SKILL_LEVEL_OPTIONS);

  // 性別設定の状態
  const [genderEnabled, setGenderEnabled] = useState(false);
  const [showGenderDetails, setShowGenderDetails] = useState(false);
  const [genderOptions, setGenderOptions] = useState<GenderOption[]>(DEFAULT_GENDER_OPTIONS);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      name: '',
      description: '',
      location: '',
      fee: '0',
      capacity: '',
    },
  });

  useEffect(() => {
    fetchEventById(eventId);
  }, [eventId]);

  useEffect(() => {
    if (currentEvent && !isInitialized) {
      reset({
        name: currentEvent.name,
        description: currentEvent.description || '',
        location: currentEvent.location,
        fee: currentEvent.fee.toString(),
        capacity: currentEvent.capacity?.toString() || '',
      });
      setSelectedDate(new Date(currentEvent.date_time));

      // スキルレベル設定を復元
      if (currentEvent.skill_level_settings?.enabled) {
        setSkillLevelEnabled(true);
        setSkillLevelLabel(currentEvent.skill_level_settings.label || 'スキルレベル');
        setSkillLevelOptions(currentEvent.skill_level_settings.options || DEFAULT_SKILL_LEVEL_OPTIONS);
      }

      // 性別設定を復元
      if (currentEvent.gender_settings?.enabled) {
        setGenderEnabled(true);
        setGenderOptions(currentEvent.gender_settings.options || DEFAULT_GENDER_OPTIONS);
      }

      setIsInitialized(true);
    }
  }, [currentEvent, isInitialized, reset]);

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[date.getDay()];
    return `${year}年${month}月${day}日(${weekday})`;
  };

  const formatTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const handleDateChange = (date: Date) => {
    const newDate = new Date(selectedDate);
    newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
    setSelectedDate(newDate);
    setShowDatePicker(false);
  };

  const handleTimeChange = (date: Date) => {
    const newDate = new Date(selectedDate);
    newDate.setHours(date.getHours(), date.getMinutes());
    setSelectedDate(newDate);
    setShowTimePicker(false);
  };

  const onSubmit = async (data: EventFormData) => {
    try {
      const skillSettings: SkillLevelSettings | null = skillLevelEnabled
        ? {
            enabled: true,
            label: skillLevelLabel,
            options: skillLevelOptions,
          }
        : null;

      const genderSettingsData: GenderSettings | null = genderEnabled
        ? {
            enabled: true,
            options: genderOptions,
          }
        : null;

      const updateData = {
        name: data.name,
        description: data.description || null,
        date_time: selectedDate.toISOString(),
        location: data.location,
        fee: data.fee ? Number(data.fee) : 0,
        capacity: data.capacity ? Number(data.capacity) : null,
        skill_level_settings: skillSettings,
        gender_settings: genderSettingsData,
      };

      await updateEvent(eventId, updateData);
      navigation.goBack();
    } catch (error: any) {
      logger.error('[EventEdit] Error updating event:', error);
      if (typeof window !== 'undefined') {
        window.alert(error.message || 'イベントの更新に失敗しました');
      } else {
        Alert.alert('エラー', error.message || 'イベントの更新に失敗しました');
      }
    }
  };

  if (!currentEvent || !isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Section: Basic Info */}
        <Card variant="default" style={styles.section}>
          <View style={styles.sectionHeader}>
            <FileText size={20} color={colors.gray[600]} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>基本情報</Text>
          </View>

          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="イベント名"
                placeholder="例: 週末フットサル"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.name?.message}
                variant="filled"
              />
            )}
          />

          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="説明（任意）"
                placeholder="イベントの詳細を入力"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                multiline
                numberOfLines={3}
                variant="filled"
              />
            )}
          />
        </Card>

        {/* Section: Date & Time */}
        <Card variant="default" style={styles.section}>
          <View style={styles.sectionHeader}>
            <Calendar size={20} color={colors.gray[600]} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>日時</Text>
          </View>

          <View style={styles.dateTimeRow}>
            <TouchableOpacity
              style={[styles.dateTimeButton, styles.dateButton]}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.dateTimeLabel}>日付</Text>
              <Text style={styles.dateTimeValue}>{formatDate(selectedDate)}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dateTimeButton, styles.timeButton]}
              onPress={() => setShowTimePicker(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.dateTimeLabel}>時間</Text>
              <Text style={styles.dateTimeValue}>{formatTime(selectedDate)}</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Date Picker */}
        <DateTimePicker
          visible={showDatePicker}
          mode="date"
          value={selectedDate}
          onConfirm={handleDateChange}
          onCancel={() => setShowDatePicker(false)}
        />

        {/* Time Picker */}
        <DateTimePicker
          visible={showTimePicker}
          mode="time"
          value={selectedDate}
          onConfirm={handleTimeChange}
          onCancel={() => setShowTimePicker(false)}
        />

        {/* Section: Location & Fee */}
        <Card variant="default" style={styles.section}>
          <View style={styles.sectionHeader}>
            <MapPin size={20} color={colors.gray[600]} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>場所・参加費</Text>
          </View>

          <Controller
            control={control}
            name="location"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="場所"
                placeholder="例: 〇〇体育館"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.location?.message}
                variant="filled"
              />
            )}
          />

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Controller
                control={control}
                name="fee"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="参加費"
                    placeholder="0"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.fee?.message}
                    keyboardType="numeric"
                    prefix="¥"
                    variant="filled"
                  />
                )}
              />
            </View>

            <View style={styles.halfInput}>
              <Controller
                control={control}
                name="capacity"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="定員（任意）"
                    placeholder="制限なし"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.capacity?.message}
                    keyboardType="numeric"
                    suffix="人"
                    variant="filled"
                  />
                )}
              />
            </View>
          </View>
        </Card>

        {/* Section: Skill Level Option */}
        <Card variant="default" style={styles.section}>
          <View style={styles.sectionHeader}>
            <BarChart3 size={20} color={colors.gray[600]} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>オプション</Text>
          </View>

          <TouchableOpacity
            style={styles.optionRow}
            activeOpacity={0.7}
            onPress={() => setSkillLevelEnabled(!skillLevelEnabled)}
          >
            <View style={styles.optionInfo}>
              <Text style={styles.optionTitle}>スキルレベルを記入してもらう</Text>
              <Text style={styles.optionDescription}>
                参加者にスキルレベルの入力を求めます
              </Text>
            </View>
            <Switch
              value={skillLevelEnabled}
              onValueChange={setSkillLevelEnabled}
              trackColor={{ false: colors.gray[300], true: colors.primaryLight }}
              thumbColor={skillLevelEnabled ? colors.primary : colors.gray[100]}
            />
          </TouchableOpacity>

          {skillLevelEnabled && (
            <View style={styles.skillLevelContainer}>
              <TouchableOpacity
                style={styles.detailsToggle}
                activeOpacity={0.7}
                onPress={() => setShowSkillLevelDetails(!showSkillLevelDetails)}
              >
                <Text style={styles.detailsToggleText}>
                  {showSkillLevelDetails ? '詳細設定を閉じる' : '詳細設定を開く'}
                </Text>
                <Text style={styles.detailsToggleIcon}>
                  {showSkillLevelDetails ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>

              {showSkillLevelDetails && (
                <View style={styles.skillLevelDetails}>
                  <Input
                    label="ラベル名"
                    placeholder="例: スキルレベル、経験年数"
                    value={skillLevelLabel}
                    onChangeText={setSkillLevelLabel}
                    variant="filled"
                  />

                  <View style={styles.skillLevelOptionsHeader}>
                    <Text style={styles.skillLevelOptionsTitle}>選択肢（{skillLevelOptions.length}個）</Text>
                    <View style={styles.skillLevelCountButtons}>
                      <TouchableOpacity
                        style={[
                          styles.countButton,
                          skillLevelOptions.length <= MIN_SKILL_OPTIONS && styles.countButtonDisabled,
                        ]}
                        activeOpacity={0.7}
                        onPress={() => {
                          if (skillLevelOptions.length > MIN_SKILL_OPTIONS) {
                            setSkillLevelOptions(skillLevelOptions.slice(0, -1));
                          }
                        }}
                        disabled={skillLevelOptions.length <= MIN_SKILL_OPTIONS}
                      >
                        <Text
                          style={[
                            styles.countButtonText,
                            skillLevelOptions.length <= MIN_SKILL_OPTIONS && styles.countButtonTextDisabled,
                          ]}
                        >
                          −
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.countButton,
                          skillLevelOptions.length >= MAX_SKILL_OPTIONS && styles.countButtonDisabled,
                        ]}
                        activeOpacity={0.7}
                        onPress={() => {
                          if (skillLevelOptions.length < MAX_SKILL_OPTIONS) {
                            const nextValue = skillLevelOptions.length + 1;
                            const template = ADDITIONAL_SKILL_OPTIONS.find((o) => o.value === nextValue);
                            const newOption: SkillLevelOption = template || {
                              value: nextValue,
                              label: `レベル${nextValue}`,
                            };
                            setSkillLevelOptions([...skillLevelOptions, newOption]);
                          }
                        }}
                        disabled={skillLevelOptions.length >= MAX_SKILL_OPTIONS}
                      >
                        <Text
                          style={[
                            styles.countButtonText,
                            skillLevelOptions.length >= MAX_SKILL_OPTIONS && styles.countButtonTextDisabled,
                          ]}
                        >
                          ＋
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {skillLevelOptions.map((option, index) => (
                    <View key={option.value} style={styles.skillOptionItem}>
                      <View style={styles.skillOptionNumber}>
                        <Text style={styles.skillOptionNumberText}>{index + 1}</Text>
                      </View>
                      <View style={styles.skillOptionInputs}>
                        <Input
                          placeholder="ラベル"
                          value={option.label}
                          onChangeText={(text) => {
                            const newOptions = [...skillLevelOptions];
                            newOptions[index] = { ...option, label: text };
                            setSkillLevelOptions(newOptions);
                          }}
                          variant="filled"
                        />
                      </View>
                    </View>
                  ))}

                  <TouchableOpacity
                    style={styles.resetButton}
                    activeOpacity={0.7}
                    onPress={() => {
                      setSkillLevelLabel('スキルレベル');
                      setSkillLevelOptions(DEFAULT_SKILL_LEVEL_OPTIONS);
                    }}
                  >
                    <Text style={styles.resetButtonText}>デフォルトに戻す</Text>
                  </TouchableOpacity>
                </View>
              )}

              {!showSkillLevelDetails && (
                <View style={styles.skillPreview}>
                  <Text style={styles.skillPreviewTitle}>{skillLevelLabel}:</Text>
                  <View style={styles.skillPreviewOptions}>
                    {skillLevelOptions.map((option) => (
                      <View key={option.value} style={styles.skillPreviewBadge}>
                        <Text style={styles.skillPreviewBadgeText}>{option.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* 性別オプションの区切り線 */}
          {skillLevelEnabled && <View style={styles.optionDivider} />}

          {/* 性別有効化トグル */}
          <TouchableOpacity
            style={styles.optionRow}
            activeOpacity={0.7}
            onPress={() => setGenderEnabled(!genderEnabled)}
          >
            <View style={styles.optionInfo}>
              <Text style={styles.optionTitle}>性別を記入してもらう</Text>
              <Text style={styles.optionDescription}>
                参加者に性別の入力を求めます（チーム分け・料金設定用）
              </Text>
            </View>
            <Switch
              value={genderEnabled}
              onValueChange={setGenderEnabled}
              trackColor={{ false: colors.gray[300], true: colors.primaryLight }}
              thumbColor={genderEnabled ? colors.primary : colors.gray[100]}
            />
          </TouchableOpacity>

          {/* 性別詳細設定 */}
          {genderEnabled && (
            <View style={styles.skillLevelContainer}>
              <TouchableOpacity
                style={styles.detailsToggle}
                activeOpacity={0.7}
                onPress={() => setShowGenderDetails(!showGenderDetails)}
              >
                <Text style={styles.detailsToggleText}>
                  {showGenderDetails ? '詳細設定を閉じる' : '詳細設定を開く（料金設定など）'}
                </Text>
                <Text style={styles.detailsToggleIcon}>
                  {showGenderDetails ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>

              {showGenderDetails && (
                <View style={styles.skillLevelDetails}>
                  <Text style={styles.genderFeeHint}>
                    性別ごとに参加費を設定できます。空欄の場合は基本参加費が適用されます。
                  </Text>

                  {genderOptions.map((option, index) => (
                    <View key={option.value} style={styles.genderOptionItem}>
                      <View style={styles.genderOptionLabel}>
                        <Text style={styles.genderOptionLabelText}>{option.label}</Text>
                      </View>
                      <View style={styles.genderOptionFee}>
                        <Input
                          placeholder="参加費"
                          keyboardType="numeric"
                          value={option.fee?.toString() || ''}
                          onChangeText={(text) => {
                            const newOptions = [...genderOptions];
                            newOptions[index] = {
                              ...option,
                              fee: text ? Number(text) : undefined,
                            };
                            setGenderOptions(newOptions);
                          }}
                          variant="filled"
                        />
                      </View>
                      <Text style={styles.genderOptionYen}>円</Text>
                    </View>
                  ))}

                  <TouchableOpacity
                    style={styles.resetButton}
                    activeOpacity={0.7}
                    onPress={() => {
                      setGenderOptions(DEFAULT_GENDER_OPTIONS);
                    }}
                  >
                    <Text style={styles.resetButtonText}>料金設定をクリア</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* プレビュー */}
              {!showGenderDetails && (
                <View style={styles.skillPreview}>
                  <Text style={styles.skillPreviewTitle}>性別:</Text>
                  <View style={styles.skillPreviewOptions}>
                    {genderOptions.map((option) => (
                      <View key={option.value} style={styles.skillPreviewBadge}>
                        <Text style={styles.skillPreviewBadgeText}>
                          {option.label}
                          {option.fee !== undefined && ` (¥${option.fee.toLocaleString()})`}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}
        </Card>

        {/* Submit Button */}
        <View style={styles.submitContainer}>
          <Button
            title="変更を保存"
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
            fullWidth
            size="lg"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    fontSize: typography.fontSize.base,
    color: colors.gray[500],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionIcon: {
    marginRight: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.gray[900],
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  dateTimeButton: {
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  dateButton: {
    flex: 2,
  },
  timeButton: {
    flex: 1,
  },
  dateTimeLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[500],
    marginBottom: spacing.xs,
  },
  dateTimeValue: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.gray[900],
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfInput: {
    flex: 1,
  },
  submitContainer: {
    marginTop: spacing.lg,
  },
  // オプションセクション
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  optionInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  optionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
  },
  // スキルレベル設定
  skillLevelContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  detailsToggleText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: '500',
  },
  detailsToggleIcon: {
    fontSize: typography.fontSize.xs,
    color: colors.primary,
    marginLeft: spacing.xs,
  },
  skillLevelDetails: {
    marginTop: spacing.md,
  },
  skillLevelOptionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  skillLevelOptionsTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.gray[700],
  },
  skillLevelCountButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  countButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countButtonDisabled: {
    backgroundColor: colors.gray[200],
  },
  countButtonText: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.white,
  },
  countButtonTextDisabled: {
    color: colors.gray[400],
  },
  skillOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  skillOptionNumber: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  skillOptionNumberText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  skillOptionInputs: {
    flex: 1,
  },
  resetButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  resetButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
  },
  // プレビュー
  skillPreview: {
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.lg,
  },
  skillPreviewTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.gray[600],
    marginBottom: spacing.sm,
  },
  skillPreviewOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  skillPreviewBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  skillPreviewBadgeText: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[700],
  },
  // 性別設定
  optionDivider: {
    height: 1,
    backgroundColor: colors.gray[100],
    marginVertical: spacing.md,
  },
  genderFeeHint: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    marginBottom: spacing.md,
    lineHeight: typography.fontSize.sm * 1.5,
  },
  genderOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  genderOptionLabel: {
    width: 60,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primarySoft,
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
  },
  genderOptionLabelText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
  },
  genderOptionFee: {
    flex: 1,
  },
  genderOptionYen: {
    fontSize: typography.fontSize.base,
    color: colors.gray[600],
    marginLeft: spacing.xs,
  },
});
