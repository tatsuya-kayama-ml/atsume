import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Switch,
  Modal,
  FlatList,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FileText, MapPin, Coins, BarChart3, Calendar, Clock, Copy, X, ChevronRight } from 'lucide-react-native';
import { Button, Input, Card, DateTimePicker } from '../../components/common';
import { useEventStore } from '../../stores/eventStore';
import { useToast } from '../../contexts/ToastContext';
import { colors, spacing, typography, borderRadius } from '../../constants/theme';
import { RootStackParamList, SkillLevelOption, SkillLevelSettings, GenderOption, GenderSettings, Event } from '../../types';
import { logger, formatDateTime } from '../../utils';

// デフォルトのスキルレベルオプション（3段階）
const DEFAULT_SKILL_LEVEL_OPTIONS: SkillLevelOption[] = [
  { value: 1, label: '初心者' },
  { value: 2, label: '少しだけ経験者' },
  { value: 3, label: 'がっつり経験者' },
];

// 追加用のテンプレート
const ADDITIONAL_SKILL_OPTIONS: SkillLevelOption[] = [
  { value: 4, label: '上級者' },
  { value: 5, label: 'エキスパート' },
];

const MIN_SKILL_OPTIONS = 1;
const MAX_SKILL_OPTIONS = 5;

// デフォルトの性別オプション
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
  location: z.string().max(30, '場所は30文字以内で入力してください').optional(),
  fee: z
    .string()
    .optional()
    .refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 0), '有効な金額を入力してください'),
  capacity: z
    .string()
    .optional()
    .refine((val) => !val || (!isNaN(Number(val)) && Number(val) > 0), '有効な人数を入力してください'),
});

type EventFormData = z.infer<typeof eventSchema>;

interface Props {
  navigation: NativeStackNavigationProp<RootStackParamList, 'EventCreate'>;
}

// 時間を30分単位に丸める関数
const roundTo30Minutes = (date: Date): Date => {
  const rounded = new Date(date);
  const minutes = rounded.getMinutes();
  // 30分単位に切り上げ
  if (minutes === 0 || minutes === 30) {
    // そのまま
  } else if (minutes < 30) {
    rounded.setMinutes(30);
  } else {
    rounded.setMinutes(0);
    rounded.setHours(rounded.getHours() + 1);
  }
  rounded.setSeconds(0);
  rounded.setMilliseconds(0);
  return rounded;
};

export const EventCreateScreen: React.FC<Props> = ({ navigation }) => {
  const { createEvent, events, fetchMyEvents } = useEventStore();
  const { showToast } = useToast();
  const [selectedDate, setSelectedDate] = useState(() => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    return date;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // 過去イベントからコピー
  const [showCopyModal, setShowCopyModal] = useState(false);

  // スキルレベル設定の状態
  const [skillLevelEnabled, setSkillLevelEnabled] = useState(false);
  const [showSkillLevelDetails, setShowSkillLevelDetails] = useState(false);
  const [skillLevelLabel, setSkillLevelLabel] = useState('スキルレベル');
  const [skillLevelOptions, setSkillLevelOptions] = useState<SkillLevelOption[]>(DEFAULT_SKILL_LEVEL_OPTIONS);

  // 性別設定の状態
  const [genderEnabled, setGenderEnabled] = useState(false);
  const [showGenderDetails, setShowGenderDetails] = useState(false);
  const [genderOptions, setGenderOptions] = useState<GenderOption[]>(DEFAULT_GENDER_OPTIONS);

  // 参加締め切り設定の状態
  const [rsvpDeadlineEnabled, setRsvpDeadlineEnabled] = useState(false);
  const [rsvpDeadlineDate, setRsvpDeadlineDate] = useState<Date>(() => {
    // デフォルトはイベント日時の1日前
    const date = new Date();
    date.setHours(23, 59, 0, 0);
    return date;
  });
  const [showRsvpDeadlineDatePicker, setShowRsvpDeadlineDatePicker] = useState(false);
  const [showRsvpDeadlineTimePicker, setShowRsvpDeadlineTimePicker] = useState(false);

  // 過去イベント一覧を取得（初回のみ）
  useEffect(() => {
    if (events.length === 0) {
      fetchMyEvents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // イベント日時が変更されたら、締め切り日時のデフォルトを更新（イベント前日の23:59）
  useEffect(() => {
    if (!rsvpDeadlineEnabled) {
      const defaultDeadline = new Date(selectedDate);
      defaultDeadline.setDate(defaultDeadline.getDate() - 1);
      defaultDeadline.setHours(23, 59, 0, 0);
      setRsvpDeadlineDate(defaultDeadline);
    }
  }, [selectedDate, rsvpDeadlineEnabled]);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      name: '',
      description: '',
      location: '',
      fee: '',
      capacity: '',
    },
  });

  // 過去イベントからコピー
  const handleCopyFromEvent = (event: Event) => {
    setValue('name', event.name);
    setValue('description', event.description || '');
    setValue('location', event.location);
    setValue('fee', event.fee?.toString() || '');
    setValue('capacity', event.capacity?.toString() || '');

    // スキルレベル設定をコピー
    if (event.skill_level_settings?.enabled) {
      setSkillLevelEnabled(true);
      setSkillLevelLabel(event.skill_level_settings.label || 'スキルレベル');
      setSkillLevelOptions(event.skill_level_settings.options || DEFAULT_SKILL_LEVEL_OPTIONS);
    } else {
      setSkillLevelEnabled(false);
    }

    // 性別設定をコピー
    if (event.gender_settings?.enabled) {
      setGenderEnabled(true);
      setGenderOptions(event.gender_settings.options || DEFAULT_GENDER_OPTIONS);
    } else {
      setGenderEnabled(false);
    }

    setShowCopyModal(false);
    showToast('イベント設定をコピーしました', 'success');
  };

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[date.getDay()];
    return `${year}/${month}/${day}(${weekday})`;
  };

  const formatTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const handleDateConfirm = (date: Date) => {
    const newDate = new Date(selectedDate);
    newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
    setSelectedDate(newDate);
    setShowDatePicker(false);
  };

  const handleTimeConfirm = (date: Date) => {
    const newDate = new Date(selectedDate);
    newDate.setHours(date.getHours(), date.getMinutes());
    setSelectedDate(newDate);
    setShowTimePicker(false);
  };

  const handleRsvpDeadlineDateConfirm = (date: Date) => {
    const newDate = new Date(rsvpDeadlineDate);
    newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
    setRsvpDeadlineDate(newDate);
    setShowRsvpDeadlineDatePicker(false);
  };

  const handleRsvpDeadlineTimeConfirm = (date: Date) => {
    const newDate = new Date(rsvpDeadlineDate);
    newDate.setHours(date.getHours(), date.getMinutes());
    setRsvpDeadlineDate(newDate);
    setShowRsvpDeadlineTimePicker(false);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  const onSubmit = async (data: EventFormData) => {
    logger.log('[EventCreate] onSubmit called');

    // useRefで同期的に二重送信を防止（useStateは非同期更新のため競合状態が発生しうる）
    if (isSubmittingRef.current) {
      logger.log('[EventCreate] Already submitting, skipping');
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      // スキルレベル設定を構築
      const skillSettings: SkillLevelSettings | undefined = skillLevelEnabled
        ? {
            enabled: true,
            label: skillLevelLabel,
            options: skillLevelOptions,
          }
        : undefined;

      // 性別設定を構築
      const genderSettingsData: GenderSettings | undefined = genderEnabled
        ? {
            enabled: true,
            options: genderOptions,
          }
        : undefined;

      const eventData = {
        name: data.name,
        description: data.description,
        date_time: selectedDate.toISOString(),
        location: data.location || '未定',
        fee: data.fee ? Number(data.fee) : 0,
        capacity: data.capacity ? Number(data.capacity) : undefined,
        skill_level_settings: skillSettings,
        gender_settings: genderSettingsData,
        rsvp_deadline: rsvpDeadlineEnabled ? rsvpDeadlineDate.toISOString() : undefined,
      };
      logger.log('[EventCreate] Creating event');

      const event = await createEvent(eventData);
      logger.log('[EventCreate] Event created successfully:', event?.id);

      // 作成成功後、ホームに戻る
      navigation.goBack();
    } catch (error: any) {
      logger.error('[EventCreate] Error creating event:', error);
      showToast(error.message || 'イベントの作成に失敗しました', 'error');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Progress indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '100%' }]} />
          </View>
          <View style={styles.progressHeader}>
            <Text style={styles.progressText}>新規イベント作成</Text>
            {events.length > 0 && (
              <TouchableOpacity
                style={styles.copyFromEventButton}
                onPress={() => setShowCopyModal(true)}
                activeOpacity={0.7}
              >
                <Copy size={14} color={colors.primary} />
                <Text style={styles.copyFromEventText}>過去のイベントからコピー</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Section: Basic Info */}
        <Card variant="default" style={styles.section}>
          <View style={styles.sectionHeader}>
            <FileText size={18} color={colors.primary} style={styles.sectionIconStyle} />
            <Text style={styles.sectionTitle}>基本情報</Text>
          </View>

          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="イベント名"
                placeholder="例: 6/15 バドミントン練習会"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.name?.message}
                variant="filled"
                required
              />
            )}
          />

          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="説明（任意）"
                placeholder="イベントの詳細を入力..."
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                multiline
                numberOfLines={4}
                error={errors.description?.message}
                variant="filled"
              />
            )}
          />
        </Card>

        {/* Section: Date & Location */}
        <Card variant="default" style={styles.section}>
          <View style={styles.sectionHeader}>
            <MapPin size={18} color={colors.primary} style={styles.sectionIconStyle} />
            <Text style={styles.sectionTitle}>日時・場所</Text>
          </View>

          <View style={styles.dateTimeContainer}>
            <View style={styles.dateTimeItem}>
              <Text style={styles.inputLabel}>日付<Text style={styles.requiredMark}> *</Text></Text>
              <TouchableOpacity
                style={styles.dateTimeButton}
                activeOpacity={0.7}
                onPress={() => setShowDatePicker(true)}
              >
                <Calendar size={16} color={colors.gray[500]} style={styles.dateTimeIconStyle} />
                <Text style={styles.dateTimeText}>{formatDate(selectedDate)}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.dateTimeItem}>
              <Text style={styles.inputLabel}>時間<Text style={styles.requiredMark}> *</Text></Text>
              <TouchableOpacity
                style={styles.dateTimeButton}
                activeOpacity={0.7}
                onPress={() => setShowTimePicker(true)}
              >
                <Clock size={16} color={colors.gray[500]} style={styles.dateTimeIconStyle} />
                <Text style={styles.dateTimeText}>{formatTime(selectedDate)}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Controller
            control={control}
            name="location"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="場所（任意）"
                placeholder="例: ○○体育館（空欄の場合は「未定」）"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.location?.message}
                variant="filled"
              />
            )}
          />
        </Card>

        {/* Section: Fee & Capacity */}
        <Card variant="default" style={styles.section}>
          <View style={styles.sectionHeader}>
            <Coins size={18} color={colors.primary} style={styles.sectionIconStyle} />
            <Text style={styles.sectionTitle}>参加費・定員</Text>
          </View>

          <View style={styles.rowInputs}>
            <View style={styles.halfInput}>
              <Controller
                control={control}
                name="fee"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="参加費（円）"
                    placeholder="0"
                    keyboardType="numeric"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.fee?.message}
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
                    keyboardType="numeric"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.capacity?.message}
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
            <BarChart3 size={18} color={colors.primary} style={styles.sectionIconStyle} />
            <Text style={styles.sectionTitle}>オプション</Text>
          </View>

          {/* スキルレベル有効化トグル */}
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

          {/* スキルレベル詳細設定 */}
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

              {/* プレビュー */}
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

        {/* Section: RSVP Deadline */}
        <Card variant="default" style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clock size={18} color={colors.primary} style={styles.sectionIconStyle} />
            <Text style={styles.sectionTitle}>参加締め切り</Text>
          </View>

          {/* 参加締め切り有効化トグル */}
          <TouchableOpacity
            style={styles.optionRow}
            activeOpacity={0.7}
            onPress={() => setRsvpDeadlineEnabled(!rsvpDeadlineEnabled)}
          >
            <View style={styles.optionInfo}>
              <Text style={styles.optionTitle}>参加締め切りを設定する</Text>
              <Text style={styles.optionDescription}>
                締め切り後は参加受付を自動で終了します
              </Text>
            </View>
            <Switch
              value={rsvpDeadlineEnabled}
              onValueChange={setRsvpDeadlineEnabled}
              trackColor={{ false: colors.gray[300], true: colors.primaryLight }}
              thumbColor={rsvpDeadlineEnabled ? colors.primary : colors.gray[100]}
            />
          </TouchableOpacity>

          {/* 締め切り日時設定 */}
          {rsvpDeadlineEnabled && (
            <View style={styles.rsvpDeadlineContainer}>
              <View style={styles.dateTimeContainer}>
                <View style={styles.dateTimeItem}>
                  <Text style={styles.inputLabel}>締め切り日</Text>
                  <TouchableOpacity
                    style={styles.dateTimeButton}
                    activeOpacity={0.7}
                    onPress={() => setShowRsvpDeadlineDatePicker(true)}
                  >
                    <Calendar size={16} color={colors.gray[500]} style={styles.dateTimeIconStyle} />
                    <Text style={styles.dateTimeText}>{formatDate(rsvpDeadlineDate)}</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.dateTimeItem}>
                  <Text style={styles.inputLabel}>締め切り時間</Text>
                  <TouchableOpacity
                    style={styles.dateTimeButton}
                    activeOpacity={0.7}
                    onPress={() => setShowRsvpDeadlineTimePicker(true)}
                  >
                    <Clock size={16} color={colors.gray[500]} style={styles.dateTimeIconStyle} />
                    <Text style={styles.dateTimeText}>{formatTime(rsvpDeadlineDate)}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.rsvpDeadlineHint}>
                この日時を過ぎると、新規参加や出欠変更ができなくなります。締め切り後、出席予定者は自動的にチェックイン対象になります。
              </Text>
            </View>
          )}
        </Card>

        {/* Submit Button */}
        <View style={styles.submitContainer}>
          <Button
            title="イベントを作成"
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
            fullWidth
            size="lg"
          />
        </View>
      </ScrollView>

      {/* Date Picker Modal */}
      <DateTimePicker
        visible={showDatePicker}
        mode="date"
        value={selectedDate}
        onConfirm={handleDateConfirm}
        onCancel={() => setShowDatePicker(false)}
      />

      {/* Time Picker Modal */}
      <DateTimePicker
        visible={showTimePicker}
        mode="time"
        value={selectedDate}
        onConfirm={handleTimeConfirm}
        onCancel={() => setShowTimePicker(false)}
      />

      {/* RSVP Deadline Date Picker Modal */}
      <DateTimePicker
        visible={showRsvpDeadlineDatePicker}
        mode="date"
        value={rsvpDeadlineDate}
        onConfirm={handleRsvpDeadlineDateConfirm}
        onCancel={() => setShowRsvpDeadlineDatePicker(false)}
      />

      {/* RSVP Deadline Time Picker Modal */}
      <DateTimePicker
        visible={showRsvpDeadlineTimePicker}
        mode="time"
        value={rsvpDeadlineDate}
        onConfirm={handleRsvpDeadlineTimeConfirm}
        onCancel={() => setShowRsvpDeadlineTimePicker(false)}
      />

      {/* Copy from Past Event Modal */}
      <Modal
        visible={showCopyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCopyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>過去のイベントからコピー</Text>
              <TouchableOpacity
                onPress={() => setShowCopyModal(false)}
                style={styles.modalCloseButton}
              >
                <X size={24} color={colors.gray[500]} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              場所・参加費・オプション設定がコピーされます
            </Text>
            <FlatList
              data={events}
              keyExtractor={(item) => item.id}
              style={styles.eventList}
              renderItem={({ item }) => {
                const { fullDate } = formatDateTime(item.date_time);
                return (
                  <TouchableOpacity
                    style={styles.eventListItem}
                    onPress={() => handleCopyFromEvent(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.eventListItemContent}>
                      <Text style={styles.eventListItemName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.eventListItemMeta}>
                        {fullDate} · {item.location}
                      </Text>
                    </View>
                    <ChevronRight size={20} color={colors.gray[400]} />
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyList}>
                  <Text style={styles.emptyListText}>過去のイベントがありません</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  progressContainer: {
    marginBottom: spacing.lg,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.gray[200],
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  progressText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    fontWeight: '500',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  copyFromEventButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: borderRadius.md,
  },
  copyFromEventText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: colors.primary,
  },
  section: {
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  sectionIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  sectionIconStyle: {
    marginRight: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.gray[900],
  },
  inputLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.gray[700],
    marginBottom: spacing.sm,
  },
  requiredMark: {
    color: colors.error,
    fontWeight: '600',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  dateTimeItem: {
    flex: 1,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    backgroundColor: colors.gray[50],
  },
  dateTimeIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  dateTimeIconStyle: {
    marginRight: spacing.sm,
  },
  dateTimeText: {
    fontSize: typography.fontSize.base,
    color: colors.gray[900],
    fontWeight: '500',
  },
  rowInputs: {
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
  optionDivider: {
    height: 1,
    backgroundColor: colors.gray[100],
    marginVertical: spacing.md,
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
    width: 44,
    height: 44,
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
  // 参加締め切り設定
  rsvpDeadlineContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  rsvpDeadlineHint: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    marginTop: spacing.md,
    lineHeight: typography.fontSize.sm * 1.6,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '70%',
    paddingBottom: spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.gray[900],
  },
  modalCloseButton: {
    padding: spacing.xs,
  },
  modalSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  eventList: {
    paddingHorizontal: spacing.lg,
  },
  eventListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  eventListItemContent: {
    flex: 1,
  },
  eventListItemName: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: colors.gray[900],
    marginBottom: 2,
  },
  eventListItemMeta: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
  },
  emptyList: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyListText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[400],
  },
});
