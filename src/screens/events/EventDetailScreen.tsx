import React, { useEffect, useCallback, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  RefreshControl,
  Dimensions,
  Platform,
  Modal,
  TextInput,
  Linking as RNLinking,
  PanResponder,
  Animated,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Users,
  Check,
  Coins,
  ClipboardList,
  FileText,
  Calendar,
  MapPin,
  Banknote,
  Ticket,
  Link,
  Lock,
  Edit,
  Trash2,
  Loader,
  AlertTriangle,
  Copy,
  Bell,
  UserPlus,
  ExternalLink,
  X,
  CreditCard,
  Clock,
} from 'lucide-react-native';
import { useEventStore } from '../../stores/eventStore';
import { useAuthStore } from '../../stores/authStore';
import { useTimerStore, formatTime } from '../../stores/timerStore';
import { useToast } from '../../contexts/ToastContext';
import { Button, Card, Badge, Avatar, ContextHint } from '../../components/common';
import { ReminderModal, AddParticipantModal, ParticipantDetailModal } from '../../components/events';
import { TeamsTab } from '../../components/teams';
import { MatchesTab } from '../../components/matches';
import { TimerTab } from '../../components/timer';
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme';
import { RootStackParamList, EventTabParamList, AttendanceStatus, PaymentStatus, GenderType, EventParticipant } from '../../types';
import { logger, formatDateTime } from '../../utils';

const { width } = Dimensions.get('window');
const Tab = createMaterialTopTabNavigator<EventTabParamList>();

interface Props {
  navigation: NativeStackNavigationProp<RootStackParamList, 'EventDetail'>;
  route: RouteProp<RootStackParamList, 'EventDetail'>;
}

// Status options for the event (simplified to 2 options)
const STATUS_OPTIONS = [
  { value: 'open', label: '実施予定', color: colors.success },
  { value: 'completed', label: '終了', color: colors.gray[500] },
] as const;

// Event Info Tab
const EventInfoTab: React.FC<{ eventId: string }> = ({ eventId }) => {
  const { currentEvent, participants, fetchEventById, fetchParticipants, updateEventStatus, isLoading } = useEventStore();
  const { user } = useAuthStore();
  const { showToast } = useToast();

  useFocusEffect(
    useCallback(() => {
      fetchEventById(eventId);
      fetchParticipants(eventId);
    }, [eventId])
  );

  if (!currentEvent) return null;

  const isOrganizer = currentEvent.organizer_id === user?.id;
  const { fullDate, time } = formatDateTime(currentEvent.date_time);

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === currentEvent.status) return;
    try {
      await updateEventStatus(eventId, newStatus as any);
    } catch (error: any) {
      showToast(`エラー: ${error.message}`, 'error');
    }
  };

  const attendingCount = participants.filter((p) => p.attendance_status === 'attending').length;
  const paidCount = participants.filter((p) => p.payment_status === 'paid').length;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${currentEvent.name}\n\n日時: ${fullDate} ${time}\n場所: ${currentEvent.location}\n参加費: ¥${currentEvent.fee.toLocaleString()}\n\n参加コード: ${currentEvent.event_code}`,
      });
    } catch (error) {
      logger.error('Share failed:', error);
    }
  };

  const handleCopyCode = async () => {
    try {
      await Clipboard.setStringAsync(currentEvent.event_code);
    } catch (error) {
      showToast('コピーに失敗しました', 'error');
    }
  };

  return (
    <ScrollView
      style={styles.tabContent}
      contentContainerStyle={styles.tabContentContainer}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={() => {
            fetchEventById(eventId);
            fetchParticipants(eventId);
          }}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Status Control (Organizer Only) - Simplified toggle */}
      {isOrganizer && (
        <Card variant="elevated" style={styles.statusControlCard}>
          <View style={styles.statusControlHeader}>
            <Text style={styles.statusControlTitle}>イベントステータス</Text>
            <View style={styles.statusToggleContainer}>
              {STATUS_OPTIONS.map((status) => {
                const isActive = currentEvent.status === status.value;
                return (
                  <TouchableOpacity
                    key={status.value}
                    style={[
                      styles.statusToggleButton,
                      isActive && { backgroundColor: status.color },
                    ]}
                    onPress={() => handleStatusChange(status.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.statusToggleText,
                      isActive && styles.statusToggleTextActive,
                    ]}>
                      {status.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Card>
      )}

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, styles.statCardPrimary]}>
          <View style={styles.statIconContainer}>
            <Users size={16} color={colors.primary} />
          </View>
          <Text style={styles.statValue}>{participants.length}</Text>
          <Text style={styles.statLabel}>参加登録</Text>
        </View>
        <View style={[styles.statCard, styles.statCardSuccess]}>
          <View style={styles.statIconContainer}>
            <Check size={16} color={colors.success} />
          </View>
          <Text style={[styles.statValue, { color: colors.success }]}>{attendingCount}</Text>
          <Text style={styles.statLabel}>出席予定</Text>
        </View>
        <View style={[styles.statCard, styles.statCardWarning]}>
          <View style={styles.statIconContainer}>
            <Coins size={16} color={colors.warning} />
          </View>
          <Text style={[styles.statValue, { color: colors.warning }]}>{paidCount}</Text>
          <Text style={styles.statLabel}>支払済</Text>
        </View>
      </View>

      {/* Event Details Card */}
      <Card variant="elevated" style={styles.detailCard}>
        <View style={styles.cardHeader}>
          <ClipboardList size={18} color={colors.primary} style={styles.cardHeaderIconStyle} />
          <Text style={styles.cardHeaderTitle}>イベント詳細</Text>
        </View>

        {currentEvent.description && (
          <View style={styles.detailItem}>
            <View style={styles.detailIconContainer}>
              <FileText size={16} color={colors.gray[400]} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>説明</Text>
              <Text style={styles.detailValue}>{currentEvent.description}</Text>
            </View>
          </View>
        )}

        <View style={styles.detailItem}>
          <View style={styles.detailIconContainer}>
            <Calendar size={16} color={colors.gray[400]} />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>日時</Text>
            <Text style={styles.detailValue}>{fullDate}</Text>
            <Text style={styles.detailSubValue}>{time} 開始</Text>
          </View>
        </View>

        <View style={styles.detailItem}>
          <View style={styles.detailIconContainer}>
            <MapPin size={16} color={colors.gray[400]} />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>場所</Text>
            <Text style={styles.detailValue}>{currentEvent.location}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <View style={[styles.detailItem, styles.detailItemHalf]}>
            <View style={styles.detailIconContainer}>
              <Banknote size={16} color={colors.gray[400]} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>参加費</Text>
              <Text style={styles.detailValueHighlight}>¥{currentEvent.fee.toLocaleString()}</Text>
            </View>
          </View>

          {currentEvent.capacity && (
            <View style={[styles.detailItem, styles.detailItemHalf]}>
              <View style={styles.detailIconContainer}>
                <Ticket size={16} color={colors.gray[400]} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>定員</Text>
                <Text style={styles.detailValue}>
                  <Text style={styles.detailValueHighlight}>{attendingCount}</Text>
                  <Text style={styles.detailValueMuted}> / {currentEvent.capacity}人</Text>
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Skill Level Settings Display */}
        {currentEvent.skill_level_settings?.enabled && (
          <View style={styles.optionDisplaySection}>
            <Text style={styles.optionDisplayLabel}>
              {currentEvent.skill_level_settings.label || 'スキルレベル'}
            </Text>
            <View style={styles.optionBadgesRow}>
              {currentEvent.skill_level_settings.options?.map((option: any) => (
                <View key={option.value} style={styles.optionBadge}>
                  <Text style={styles.optionBadgeText}>{option.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Gender Settings Display */}
        {currentEvent.gender_settings?.enabled && (
          <View style={styles.optionDisplaySection}>
            <Text style={styles.optionDisplayLabel}>性別設定</Text>
            <View style={styles.optionBadgesRow}>
              {currentEvent.gender_settings.options?.map((option: any) => (
                <View key={option.value} style={styles.optionBadge}>
                  <Text style={styles.optionBadgeText}>
                    {option.label}
                    {option.fee !== undefined && ` (¥${option.fee.toLocaleString()})`}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </Card>

      {/* Invite Card (Organizer Only) */}
      {isOrganizer && (
        <Card variant="elevated" style={styles.inviteCard}>
          <View style={styles.inviteHeader}>
            <View>
              <Text style={styles.inviteTitle}>招待コード</Text>
              <Text style={styles.inviteSubtitle}>タップでコピー・共有できます</Text>
            </View>
            <View style={styles.inviteBadge}>
              <Text style={styles.inviteBadgeText}>主催者</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.codeContainer}
            onPress={handleCopyCode}
            activeOpacity={0.7}
          >
            <Text style={styles.codeText}>{currentEvent.event_code}</Text>
            <View style={styles.copyIconContainer}>
              <Copy size={16} color={colors.primary} />
              <Text style={styles.copyHint}>タップでコピー</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.inviteButtonsRow}>
            <TouchableOpacity
              style={styles.inviteButtonSecondary}
              onPress={handleCopyCode}
              activeOpacity={0.7}
            >
              <Copy size={16} color={colors.primary} />
              <Text style={styles.inviteButtonSecondaryText}>コピー</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.inviteButtonPrimary}
              onPress={handleShare}
              activeOpacity={0.7}
            >
              <Link size={16} color={colors.white} />
              <Text style={styles.inviteButtonPrimaryText}>共有する</Text>
            </TouchableOpacity>
          </View>
        </Card>
      )}

      {/* Password Info - Show to organizer and participants */}
      {currentEvent.password_hash && (
        <Card variant="outlined" style={styles.passwordCard}>
          <View style={styles.passwordHeader}>
            <Lock size={20} color={colors.gray[500]} style={styles.passwordIconStyle} />
            <View style={{ flex: 1 }}>
              <Text style={styles.passwordTitle}>参加パスワード設定済み</Text>
              <Text style={styles.passwordSubtitle}>参加時にパスワードが必要です</Text>
              {currentEvent.password && (isOrganizer || participants.some(p => p.user_id === user?.id)) && (
                <View style={styles.passwordDisplayRow}>
                  <Text style={styles.passwordLabel}>パスワード:</Text>
                  <Text style={styles.passwordValue}>{currentEvent.password}</Text>
                </View>
              )}
            </View>
          </View>
        </Card>
      )}
    </ScrollView>
  );
};

// Participants Tab
const ParticipantsTab: React.FC<{ eventId: string }> = ({ eventId }) => {
  const { participants, currentEvent, fetchParticipants, updateAttendanceStatus, updateParticipantProfile, addManualParticipant, checkInParticipant, updateManualParticipant, removeParticipant, isLoading } = useEventStore();
  const { user } = useAuthStore();
  const { showToast } = useToast();
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [selectedParticipant, setSelectedParticipant] = React.useState<EventParticipant | null>(null);
  const [showDetailModal, setShowDetailModal] = React.useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchParticipants(eventId);
    }, [eventId])
  );

  const isOrganizer = currentEvent?.organizer_id === user?.id;

  // 参加者詳細モーダルを開く
  const handleOpenParticipantDetail = (participant: EventParticipant) => {
    if (isOrganizer) {
      setSelectedParticipant(participant);
      setShowDetailModal(true);
    }
  };

  // 参加者情報を更新
  const handleUpdateParticipant = async (participantId: string, data: {
    display_name?: string;
    attendance_status?: AttendanceStatus;
    payment_status?: PaymentStatus;
    skill_level?: number;
    gender?: GenderType;
  }) => {
    try {
      await updateManualParticipant(participantId, data);
      showToast('参加者情報を更新しました', 'success');
    } catch (error: any) {
      showToast(error.message || '更新に失敗しました', 'error');
      throw error;
    }
  };

  // 参加者を削除
  const handleRemoveParticipant = async (participantId: string) => {
    try {
      await removeParticipant(participantId);
      showToast('参加者を削除しました', 'success');
    } catch (error: any) {
      showToast(error.message || '削除に失敗しました', 'error');
      throw error;
    }
  };

  const handleAddParticipant = async (
    name: string,
    options: {
      attendanceStatus: AttendanceStatus;
      paymentStatus: PaymentStatus;
      skillLevel?: number;
      gender?: GenderType;
    }
  ) => {
    try {
      await addManualParticipant(eventId, name, options);
    } catch (error: any) {
      showToast(error.message || '追加に失敗しました', 'error');
      throw error;
    }
  };

  const getStatusConfig = (status: AttendanceStatus): { color: 'success' | 'error' | 'warning' | 'default'; label: string; icon: string; colorValue: string } => {
    switch (status) {
      case 'attending':
        return { color: 'success', label: '出席予定', icon: '✓', colorValue: colors.success };
      case 'not_attending':
        return { color: 'error', label: '欠席', icon: '✕', colorValue: colors.error };
      case 'maybe':
        return { color: 'warning', label: '未定', icon: '?', colorValue: colors.warning };
      case 'unconfirmed':
        return { color: 'default', label: '未確認', icon: '−', colorValue: colors.gray[500] };
      default:
        return { color: 'default', label: '未確認', icon: '−', colorValue: colors.gray[500] };
    }
  };

  const handleStatusChange = async (participantId: string, status: AttendanceStatus) => {
    try {
      await updateAttendanceStatus(participantId, status);
    } catch (error: any) {
      Alert.alert('エラー', error.message);
    }
  };

  const handleCheckIn = async (participantId: string, attended: boolean | null) => {
    try {
      await checkInParticipant(participantId, attended);
    } catch (error: any) {
      showToast(error.message || '出欠の記録に失敗しました', 'error');
    }
  };

  const myParticipation = participants.find((p) => p.user_id === user?.id);

  const attendingParticipants = participants.filter((p) => p.attendance_status === 'attending');
  const maybeParticipants = participants.filter((p) => p.attendance_status === 'maybe');
  const notAttendingParticipants = participants.filter((p) => p.attendance_status === 'not_attending');
  const unconfirmedParticipants = participants.filter((p) => p.attendance_status === 'unconfirmed');

  return (
    <ScrollView
      style={styles.tabContent}
      contentContainerStyle={styles.tabContentContainer}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={() => fetchParticipants(eventId)}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Join Event Card (Not Participating - Non-organizer) */}
      {!myParticipation && !isOrganizer && (
        <Card variant="elevated" style={styles.joinEventCard}>
          <View style={styles.joinEventIconContainer}>
            <UserPlus size={32} color={colors.primary} />
          </View>
          <Text style={styles.joinEventTitle}>まだ参加していません</Text>
          <Text style={styles.joinEventMessage}>
            このイベントに参加して出欠を登録しましょう
          </Text>
          <Button
            title="イベントに参加する"
            onPress={async () => {
              try {
                await useEventStore.getState().joinEvent(eventId);
                await fetchParticipants(eventId);
              } catch (error: any) {
                showToast(error.message || '参加に失敗しました', 'error');
              }
            }}
            icon={<UserPlus size={18} color={colors.white} />}
            fullWidth
            size="lg"
          />
        </Card>
      )}

      {/* Join Event Card (Organizer not participating) */}
      {!myParticipation && isOrganizer && (
        <Card variant="elevated" style={styles.joinEventCard}>
          <View style={[styles.joinEventIconContainer, { backgroundColor: colors.primarySoft }]}>
            <UserPlus size={32} color={colors.primary} />
          </View>
          <Text style={styles.joinEventTitle}>主催者として参加</Text>
          <Text style={styles.joinEventMessage}>
            自分も参加者として登録すると、出欠状況やスキルレベルを設定できます
          </Text>
          <Button
            title="参加者として追加する"
            onPress={async () => {
              try {
                await useEventStore.getState().joinEvent(eventId);
                await fetchParticipants(eventId);
              } catch (error: any) {
                showToast(error.message || '追加に失敗しました', 'error');
              }
            }}
            icon={<UserPlus size={18} color={colors.white} />}
            fullWidth
            size="lg"
          />
        </Card>
      )}

      {/* Context Hint for Participants */}
      {myParticipation && !isOrganizer && (
        <ContextHint tooltipId="participant_attendance" />
      )}

      {/* My Status Card - 主催者以外のみ表示 */}
      {myParticipation && !isOrganizer && (
        <Card variant="elevated" style={styles.myStatusCard}>
          <View style={styles.myStatusHeader}>
            <View style={styles.myStatusTitleRow}>
              <Text style={styles.myStatusTitle}>あなたの出欠状況</Text>
              {isOrganizer && (
                <View style={styles.organizerBadge}>
                  <Text style={styles.organizerBadgeText}>主催者</Text>
                </View>
              )}
            </View>
            <Badge
              label={getStatusConfig(myParticipation.attendance_status).label}
              color={getStatusConfig(myParticipation.attendance_status).color}
              size="md"
            />
          </View>

          <View style={styles.statusButtonsContainer}>
            {(['attending', 'maybe', 'not_attending'] as AttendanceStatus[]).map((status) => {
              const config = getStatusConfig(status);
              const isSelected = myParticipation.attendance_status === status;
              return (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusButton,
                    isSelected && {
                      backgroundColor: config.color === 'success' ? colors.successSoft :
                                       config.color === 'warning' ? colors.warningSoft :
                                       config.color === 'error' ? colors.errorSoft : colors.gray[100],
                      borderColor: config.colorValue,
                    },
                  ]}
                  onPress={() => handleStatusChange(myParticipation.id, status)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.statusButtonIcon,
                    isSelected && { color: config.colorValue },
                  ]}>
                    {config.icon}
                  </Text>
                  <Text style={[
                    styles.statusButtonText,
                    isSelected && { color: config.colorValue, fontWeight: '700' },
                  ]}>
                    {config.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Skill Level Selection */}
          {currentEvent?.skill_level_settings?.enabled && (
            <View style={styles.profileSection}>
              <Text style={styles.profileSectionTitle}>
                {currentEvent.skill_level_settings.label || 'スキルレベル'}
              </Text>
              <View style={styles.profileOptionsRow}>
                {currentEvent.skill_level_settings.options?.map((option: any) => {
                  const isSelected = myParticipation.skill_level === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.profileOptionButton,
                        isSelected && styles.profileOptionButtonActive,
                      ]}
                      onPress={() => updateParticipantProfile(myParticipation.id, { skill_level: option.value })}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.profileOptionText,
                        isSelected && styles.profileOptionTextActive,
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Gender Selection */}
          {currentEvent?.gender_settings?.enabled && (
            <View style={styles.profileSection}>
              <Text style={styles.profileSectionTitle}>性別</Text>
              <View style={styles.profileOptionsRow}>
                {currentEvent.gender_settings.options?.map((option: any) => {
                  const isSelected = myParticipation.gender === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.profileOptionButton,
                        isSelected && styles.profileOptionButtonActive,
                      ]}
                      onPress={() => updateParticipantProfile(myParticipation.id, { gender: option.value })}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.profileOptionText,
                        isSelected && styles.profileOptionTextActive,
                      ]}>
                        {option.label}
                        {option.fee !== undefined && ` (¥${option.fee.toLocaleString()})`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </Card>
      )}


      {/* Attendance Stats */}
      {isOrganizer ? (
        <>
          {/* 主催者向け: 出席予定 + 実際の出席 */}
          <View style={styles.attendanceStatsGrid}>
            {/* ヘッダー: タイトル + 追加ボタン */}
            <View style={styles.attendanceStatsHeader}>
              <Text style={styles.attendanceStatsHeaderTitle}>参加者一覧</Text>
              <TouchableOpacity
                style={styles.addParticipantIconButton}
                onPress={() => setShowAddModal(true)}
                activeOpacity={0.7}
              >
                <UserPlus size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.attendanceStatsDivider} />
            <View style={styles.attendanceStatsColumn}>
              <Text style={styles.attendanceStatsTitle}>出席予定</Text>
              <View style={styles.attendanceStatsRow}>
                <View style={[styles.attendanceStatItem, { backgroundColor: colors.successSoft }]}>
                  <Text style={[styles.attendanceStatValue, { color: colors.success }]}>{attendingParticipants.length}</Text>
                  <Text style={styles.attendanceStatLabel}>出席予定</Text>
                </View>
                <View style={[styles.attendanceStatItem, { backgroundColor: colors.warningSoft }]}>
                  <Text style={[styles.attendanceStatValue, { color: colors.warning }]}>{maybeParticipants.length}</Text>
                  <Text style={styles.attendanceStatLabel}>未定</Text>
                </View>
                <View style={[styles.attendanceStatItem, { backgroundColor: colors.errorSoft }]}>
                  <Text style={[styles.attendanceStatValue, { color: colors.error }]}>{notAttendingParticipants.length}</Text>
                  <Text style={styles.attendanceStatLabel}>欠席</Text>
                </View>
                <View style={[styles.attendanceStatItem, { backgroundColor: colors.gray[100] }]}>
                  <Text style={[styles.attendanceStatValue, { color: colors.gray[500] }]}>{unconfirmedParticipants.length}</Text>
                  <Text style={styles.attendanceStatLabel}>未確認</Text>
                </View>
              </View>
            </View>
            <View style={styles.attendanceStatsDivider} />
            <View style={styles.attendanceStatsColumn}>
              <Text style={styles.attendanceStatsTitle}>実際の出席</Text>
              <View style={styles.attendanceStatsRow}>
                <View style={[styles.attendanceStatItem, { backgroundColor: colors.successSoft }]}>
                  <Text style={[styles.attendanceStatValue, { color: colors.success }]}>
                    {participants.filter(p => p.actual_attendance === true).length}
                  </Text>
                  <Text style={styles.attendanceStatLabel}>出席</Text>
                </View>
                <View style={[styles.attendanceStatItem, { backgroundColor: colors.errorSoft }]}>
                  <Text style={[styles.attendanceStatValue, { color: colors.error }]}>
                    {participants.filter(p => p.actual_attendance === false).length}
                  </Text>
                  <Text style={styles.attendanceStatLabel}>欠席</Text>
                </View>
                <View style={[styles.attendanceStatItem, { backgroundColor: colors.gray[100] }]}>
                  <Text style={[styles.attendanceStatValue, { color: colors.gray[500] }]}>
                    {participants.filter(p => p.actual_attendance === null).length}
                  </Text>
                  <Text style={styles.attendanceStatLabel}>未確認</Text>
                </View>
              </View>
            </View>
          </View>
        </>
      ) : (
        <Card variant="elevated" style={styles.summaryCard}>
          {/* 参加者向け: シンプルな予定サマリー */}
          <Text style={styles.summaryCardTitle}>出席予定</Text>
          <View style={styles.participantSummary}>
            <View style={styles.summaryItem}>
              <View style={[styles.summaryIconCircle, { backgroundColor: colors.successSoft }]}>
                <Text style={[styles.summaryCount, { color: colors.success }]}>{attendingParticipants.length}</Text>
              </View>
              <Text style={styles.summaryLabel}>出席予定</Text>
            </View>
            <View style={styles.summaryItem}>
              <View style={[styles.summaryIconCircle, { backgroundColor: colors.warningSoft }]}>
                <Text style={[styles.summaryCount, { color: colors.warning }]}>{maybeParticipants.length}</Text>
              </View>
              <Text style={styles.summaryLabel}>未定</Text>
            </View>
            <View style={styles.summaryItem}>
              <View style={[styles.summaryIconCircle, { backgroundColor: colors.errorSoft }]}>
                <Text style={[styles.summaryCount, { color: colors.error }]}>{notAttendingParticipants.length}</Text>
              </View>
              <Text style={styles.summaryLabel}>欠席</Text>
            </View>
            <View style={styles.summaryItem}>
              <View style={[styles.summaryIconCircle, { backgroundColor: colors.gray[100] }]}>
                <Text style={[styles.summaryCount, { color: colors.gray[500] }]}>{unconfirmedParticipants.length}</Text>
              </View>
              <Text style={styles.summaryLabel}>未確認</Text>
            </View>
          </View>
        </Card>
      )}

      {/* Participant Groups */}
      {attendingParticipants.length > 0 && (
        <View style={styles.participantGroup}>
          <View style={styles.groupHeader}>
            <View style={[styles.groupIndicator, { backgroundColor: colors.success }]} />
            <Text style={styles.groupTitle}>出席予定</Text>
            <Text style={styles.groupCount}>{attendingParticipants.length}人</Text>
          </View>
          {attendingParticipants.map((participant) => (
            <ParticipantCard
              key={participant.id}
              participant={participant}
              status="attending"
              skillLevelSettings={currentEvent?.skill_level_settings}
              genderSettings={currentEvent?.gender_settings}
              checkInMode={isOrganizer}
              onCheckIn={handleCheckIn}
              isOrganizer={isOrganizer}
              onPress={handleOpenParticipantDetail}
            />
          ))}
        </View>
      )}

      {maybeParticipants.length > 0 && (
        <View style={styles.participantGroup}>
          <View style={styles.groupHeader}>
            <View style={[styles.groupIndicator, { backgroundColor: colors.warning }]} />
            <Text style={styles.groupTitle}>検討中</Text>
            <Text style={styles.groupCount}>{maybeParticipants.length}人</Text>
          </View>
          {maybeParticipants.map((participant) => (
            <ParticipantCard
              key={participant.id}
              participant={participant}
              status="maybe"
              skillLevelSettings={currentEvent?.skill_level_settings}
              genderSettings={currentEvent?.gender_settings}
              checkInMode={isOrganizer}
              onCheckIn={handleCheckIn}
              isOrganizer={isOrganizer}
              onPress={handleOpenParticipantDetail}
            />
          ))}
        </View>
      )}

      {notAttendingParticipants.length > 0 && (
        <View style={styles.participantGroup}>
          <View style={styles.groupHeader}>
            <View style={[styles.groupIndicator, { backgroundColor: colors.error }]} />
            <Text style={styles.groupTitle}>欠席</Text>
            <Text style={styles.groupCount}>{notAttendingParticipants.length}人</Text>
          </View>
          {notAttendingParticipants.map((participant) => (
            <ParticipantCard
              key={participant.id}
              participant={participant}
              status="not_attending"
              skillLevelSettings={currentEvent?.skill_level_settings}
              genderSettings={currentEvent?.gender_settings}
              checkInMode={isOrganizer}
              onCheckIn={handleCheckIn}
              isOrganizer={isOrganizer}
              onPress={handleOpenParticipantDetail}
            />
          ))}
        </View>
      )}

      {unconfirmedParticipants.length > 0 && (
        <View style={styles.participantGroup}>
          <View style={styles.groupHeader}>
            <View style={[styles.groupIndicator, { backgroundColor: colors.gray[400] }]} />
            <Text style={styles.groupTitle}>未確認</Text>
            <Text style={styles.groupCount}>{unconfirmedParticipants.length}人</Text>
          </View>
          {unconfirmedParticipants.map((participant) => (
            <ParticipantCard
              key={participant.id}
              participant={participant}
              status="unconfirmed"
              skillLevelSettings={currentEvent?.skill_level_settings}
              genderSettings={currentEvent?.gender_settings}
              checkInMode={isOrganizer}
              onCheckIn={handleCheckIn}
              isOrganizer={isOrganizer}
              onPress={handleOpenParticipantDetail}
            />
          ))}
        </View>
      )}

      {/* Add Participant Modal */}
      <AddParticipantModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddParticipant}
        skillLevelSettings={currentEvent?.skill_level_settings}
        genderSettings={currentEvent?.gender_settings}
      />

      {/* Participant Detail Modal */}
      <ParticipantDetailModal
        visible={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedParticipant(null);
        }}
        participant={selectedParticipant}
        isOrganizer={isOrganizer}
        skillLevelSettings={currentEvent?.skill_level_settings}
        genderSettings={currentEvent?.gender_settings}
        onUpdate={handleUpdateParticipant}
        onRemove={handleRemoveParticipant}
        onCheckIn={handleCheckIn}
      />
    </ScrollView>
  );
};

// Participant Card Component
const ParticipantCard: React.FC<{
  participant: any;
  status: AttendanceStatus;
  skillLevelSettings?: any;
  genderSettings?: any;
  checkInMode?: boolean;
  onCheckIn?: (participantId: string, attended: boolean) => void;
  isOrganizer?: boolean;
  onPress?: (participant: any) => void;
}> = ({ participant, status, skillLevelSettings, genderSettings, checkInMode = false, onCheckIn, isOrganizer = false, onPress }) => {
  // For manual participants, use display_name directly; for registered users, use user.display_name
  const displayName = participant.display_name || participant.user?.display_name || '名前未設定';
  const avatarUrl = participant.user?.avatar_url;
  const isManual = participant.is_manual || !participant.user_id;
  const actualAttendance = participant.actual_attendance;

  // Get skill level label
  const skillLevelLabel = skillLevelSettings?.enabled && participant.skill_level
    ? skillLevelSettings.options?.find((o: any) => o.value === participant.skill_level)?.label
    : null;

  // Get gender label
  const genderLabel = genderSettings?.enabled && participant.gender
    ? genderSettings.options?.find((o: any) => o.value === participant.gender)?.label
    : null;

  const CardWrapper = isOrganizer && onPress ? TouchableOpacity : View;
  const cardProps = isOrganizer && onPress ? { onPress: () => onPress(participant), activeOpacity: 0.7 } : {};

  return (
    <CardWrapper style={styles.participantCard} {...cardProps}>
      <Avatar name={displayName} imageUrl={avatarUrl} size="md" />
      <View style={styles.participantInfo}>
        <View style={styles.participantNameRow}>
          <Text style={styles.participantName}>{displayName}</Text>
          <View style={styles.participantBadgesInline}>
            {isManual && (
              <Badge label="手動" color="default" size="sm" variant="soft" />
            )}
            {participant.payment_status === 'paid' && (
              <Badge label="支払済" color="success" size="sm" variant="soft" />
            )}
          </View>
        </View>
        {(skillLevelLabel || genderLabel) && (
          <View style={styles.participantBadgesRow}>
            {skillLevelLabel && (
              <View style={styles.participantSmallBadge}>
                <Text style={styles.participantSmallBadgeText}>{skillLevelLabel}</Text>
              </View>
            )}
            {genderLabel && (
              <View style={styles.participantSmallBadge}>
                <Text style={styles.participantSmallBadgeText}>{genderLabel}</Text>
              </View>
            )}
          </View>
        )}
        {checkInMode && onCheckIn && (
          <View style={styles.checkInButtonsCompact}>
            <TouchableOpacity
              style={[
                styles.checkInButtonWithLabel,
                actualAttendance === true && styles.checkInButtonWithLabelActive,
              ]}
              onPress={(e) => {
                e.stopPropagation();
                onCheckIn(participant.id, actualAttendance === true ? null : true);
              }}
            >
              <Text
                style={[
                  styles.checkInButtonLabelText,
                  actualAttendance === true && styles.checkInButtonLabelTextActive,
                ]}
              >
                出席
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.checkInButtonWithLabel,
                styles.checkInButtonWithLabelAbsent,
                actualAttendance === false && styles.checkInButtonWithLabelAbsentActive,
              ]}
              onPress={(e) => {
                e.stopPropagation();
                onCheckIn(participant.id, actualAttendance === false ? null : false);
              }}
            >
              <Text
                style={[
                  styles.checkInButtonLabelText,
                  actualAttendance === false && styles.checkInButtonLabelTextAbsentActive,
                ]}
              >
                欠席
              </Text>
            </TouchableOpacity>
          </View>
        )}
        {!checkInMode && actualAttendance !== null && (
          <View style={styles.actualAttendanceBadge}>
            <Badge
              label={actualAttendance ? '実出席' : '実欠席'}
              color={actualAttendance ? 'success' : 'error'}
              size="sm"
            />
          </View>
        )}
      </View>
    </CardWrapper>
  );
};

// Payment Tab
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const PaymentTab: React.FC<{ eventId: string }> = ({ eventId }) => {
  const { participants, currentEvent, fetchParticipants, updateEvent, reportPayment, confirmPayment, updatePaymentStatus, isLoading } = useEventStore();
  const { user } = useAuthStore();
  const { showToast } = useToast();

  // Payment link modal state
  const [showPaymentLinkModal, setShowPaymentLinkModal] = useState(false);
  const [paymentLinkInput, setPaymentLinkInput] = useState('');
  const [selectedPaymentType, setSelectedPaymentType] = useState<'paypay' | 'bank' | 'other'>('paypay');
  const [customLabelInput, setCustomLabelInput] = useState('');
  const [isSavingLink, setIsSavingLink] = useState(false);

  // Payment type options
  const PAYMENT_TYPE_OPTIONS = [
    { key: 'paypay' as const, label: 'PayPay', icon: '💰' },
    { key: 'bank' as const, label: '銀行振込', icon: '🏦' },
    { key: 'other' as const, label: 'その他', icon: '📝' },
  ];

  // Swipe-to-dismiss animation for payment modal
  const paymentModalTranslateY = useRef(new Animated.Value(0)).current;
  const paymentBackdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showPaymentLinkModal) {
      paymentModalTranslateY.setValue(SCREEN_HEIGHT);
      Animated.parallel([
        Animated.timing(paymentBackdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(paymentModalTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
      ]).start();
    }
  }, [showPaymentLinkModal]);

  const closePaymentModal = useCallback(() => {
    Animated.parallel([
      Animated.timing(paymentModalTranslateY, {
        toValue: SCREEN_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(paymentBackdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowPaymentLinkModal(false);
      paymentModalTranslateY.setValue(0);
    });
  }, []);

  const paymentPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && gestureState.dy > 0;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          paymentModalTranslateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          Animated.parallel([
            Animated.timing(paymentModalTranslateY, {
              toValue: SCREEN_HEIGHT,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(paymentBackdropOpacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(() => {
            setShowPaymentLinkModal(false);
            paymentModalTranslateY.setValue(0);
          });
        } else {
          Animated.spring(paymentModalTranslateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 10,
          }).start();
        }
      },
    })
  ).current;

  useFocusEffect(
    useCallback(() => {
      fetchParticipants(eventId);
    }, [eventId])
  );

  const isOrganizer = currentEvent?.organizer_id === user?.id;
  const myParticipation = participants.find((p) => p.user_id === user?.id);

  const attendingParticipants = participants.filter((p) => p.attendance_status === 'attending');
  const totalExpected = currentEvent ? attendingParticipants.length * currentEvent.fee : 0;
  const paidParticipants = participants.filter((p) => p.payment_status === 'paid');
  const totalCollected = currentEvent ? paidParticipants.length * currentEvent.fee : 0;
  const pendingConfirmation = participants.filter((p) => p.payment_status === 'pending_confirmation');

  const progressPercentage = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;

  const handleReportPayment = async () => {
    if (!myParticipation) return;
    try {
      await reportPayment(myParticipation.id);
    } catch (error: any) {
      Alert.alert('エラー', error.message);
    }
  };

  const handleConfirmPayment = async (participantId: string) => {
    try {
      await confirmPayment(participantId);
      await fetchParticipants(eventId);
    } catch (error: any) {
      Alert.alert('エラー', error.message);
    }
  };

  const handleRevertPayment = async (participantId: string) => {
    try {
      await updatePaymentStatus(participantId, 'unpaid');
      await fetchParticipants(eventId);
    } catch (error: any) {
      Alert.alert('エラー', error.message);
    }
  };

  const getPaymentConfig = (status: string) => {
    switch (status) {
      case 'paid':
        return { color: 'success' as const, label: '支払済', icon: '✓' };
      case 'pending_confirmation':
        return { color: 'warning' as const, label: '確認待ち', icon: '⏳' };
      default:
        return { color: 'default' as const, label: '未払い', icon: '○' };
    }
  };

  // Payment link handlers
  const handleOpenPaymentLinkModal = () => {
    setPaymentLinkInput(currentEvent?.payment_link || '');
    const existingLabel = currentEvent?.payment_link_label || '';

    // Determine payment type from existing label
    if (existingLabel === 'PayPay') {
      setSelectedPaymentType('paypay');
      setCustomLabelInput('');
    } else if (existingLabel === '銀行振込') {
      setSelectedPaymentType('bank');
      setCustomLabelInput('');
    } else if (existingLabel) {
      setSelectedPaymentType('other');
      setCustomLabelInput(existingLabel);
    } else {
      setSelectedPaymentType('paypay');
      setCustomLabelInput('');
    }
    setShowPaymentLinkModal(true);
  };

  const handleSavePaymentLink = async () => {
    const url = paymentLinkInput.trim();

    // PayPay URL validation
    if (selectedPaymentType === 'paypay' && url) {
      if (!url.startsWith('https://pay.paypay.ne.jp/')) {
        showToast('PayPayの送金リンクURLを入力してください（https://pay.paypay.ne.jp/で始まるURL）', 'error');
        return;
      }
    }

    // Determine label based on selected type
    let finalLabel: string | null = null;
    if (selectedPaymentType === 'paypay') {
      finalLabel = 'PayPay';
    } else if (selectedPaymentType === 'bank') {
      finalLabel = '銀行振込';
    } else if (selectedPaymentType === 'other') {
      finalLabel = customLabelInput.trim() || null;
    }

    setIsSavingLink(true);
    try {
      await updateEvent(eventId, {
        payment_link: url || null,
        payment_link_label: finalLabel,
      });
      setShowPaymentLinkModal(false);
    } catch (error: any) {
      showToast(error.message || '保存に失敗しました', 'error');
    } finally {
      setIsSavingLink(false);
    }
  };

  const handleRemovePaymentLink = async () => {
    Alert.alert(
      '支払い情報を削除',
      '支払い情報を削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            setIsSavingLink(true);
            try {
              await updateEvent(eventId, {
                payment_link: null,
                payment_link_label: null,
              });
              setShowPaymentLinkModal(false);
            } catch (error: any) {
              showToast(error.message || '削除に失敗しました', 'error');
            } finally {
              setIsSavingLink(false);
            }
          },
        },
      ]
    );
  };

  const handleOpenPaymentLink = async () => {
    if (!currentEvent?.payment_link) return;
    try {
      const canOpen = await RNLinking.canOpenURL(currentEvent.payment_link);
      if (canOpen) {
        await RNLinking.openURL(currentEvent.payment_link);
      } else {
        showToast('リンクを開けません', 'error');
      }
    } catch {
      showToast('リンクを開けません', 'error');
    }
  };

  return (
    <ScrollView
      style={styles.tabContent}
      contentContainerStyle={styles.tabContentContainer}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={() => fetchParticipants(eventId)}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Payment Link Card (Organizer - Setup) */}
      {isOrganizer && (
        <Card variant="elevated" style={styles.paymentLinkCard}>
          <View style={styles.paymentLinkHeader}>
            <View style={styles.paymentLinkTitleRow}>
              <CreditCard size={18} color={colors.primary} />
              <Text style={styles.paymentLinkTitle}>支払い情報</Text>
            </View>
            <TouchableOpacity
              style={styles.paymentLinkEditButton}
              onPress={handleOpenPaymentLinkModal}
              activeOpacity={0.7}
            >
              <Edit size={16} color={colors.primary} />
              <Text style={styles.paymentLinkEditText}>
                {currentEvent?.payment_link ? '編集' : '設定'}
              </Text>
            </TouchableOpacity>
          </View>

          {currentEvent?.payment_link ? (
            <View style={styles.paymentLinkDisplay}>
              <View style={styles.paymentLinkInfo}>
                <Text style={styles.paymentLinkLabel}>
                  {currentEvent.payment_link_label || '支払い情報'}
                </Text>
                {currentEvent.payment_link.startsWith('http') ? (
                  <Text style={styles.paymentLinkUrl} numberOfLines={1}>
                    {currentEvent.payment_link}
                  </Text>
                ) : (
                  <Text style={styles.paymentDetailsText}>
                    {currentEvent.payment_link}
                  </Text>
                )}
              </View>
              {currentEvent.payment_link.startsWith('http') && (
                <TouchableOpacity
                  style={styles.paymentLinkOpenButton}
                  onPress={handleOpenPaymentLink}
                  activeOpacity={0.7}
                >
                  <ExternalLink size={16} color={colors.white} />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.paymentLinkEmpty}>
              <Text style={styles.paymentLinkEmptyText}>
                PayPayや銀行口座情報を設定すると、参加者に表示されます
              </Text>
            </View>
          )}
        </Card>
      )}

      {/* Payment Link Card (Participant - View) */}
      {!isOrganizer && currentEvent?.payment_link && (
        <Card variant="elevated" style={styles.paymentLinkCard}>
          <View style={styles.paymentLinkHeader}>
            <View style={styles.paymentLinkTitleRow}>
              <CreditCard size={18} color={colors.primary} />
              <Text style={styles.paymentLinkTitle}>支払い方法</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.paymentLinkButton}
            onPress={handleOpenPaymentLink}
            activeOpacity={0.7}
          >
            <View style={styles.paymentLinkButtonContent}>
              <Text style={styles.paymentLinkButtonLabel}>
                {currentEvent.payment_link_label || '支払いリンク'}
              </Text>
              <Text style={styles.paymentLinkButtonHint}>
                タップして支払いページを開く
              </Text>
            </View>
            <ExternalLink size={20} color={colors.primary} />
          </TouchableOpacity>
        </Card>
      )}

      {/* Payment Summary Card (Organizer) */}
      {isOrganizer && (
        <Card variant="elevated" style={styles.paymentSummaryCard}>
          <View style={styles.paymentSummaryHeader}>
            <Text style={styles.paymentSummaryTitle}>集金状況</Text>
            <Badge
              label={`${Math.round(progressPercentage)}%`}
              color={progressPercentage >= 100 ? 'success' : progressPercentage >= 50 ? 'warning' : 'error'}
              size="md"
            />
          </View>

          <View style={styles.paymentAmounts}>
            <View style={styles.paymentAmountItem}>
              <Text style={styles.paymentAmountLabel}>回収済</Text>
              <Text style={[styles.paymentAmountValue, { color: colors.success }]}>
                ¥{totalCollected.toLocaleString()}
              </Text>
            </View>
            <View style={styles.paymentAmountDivider} />
            <View style={styles.paymentAmountItem}>
              <Text style={styles.paymentAmountLabel}>予定総額</Text>
              <Text style={styles.paymentAmountValue}>
                ¥{totalExpected.toLocaleString()}
              </Text>
            </View>
          </View>

          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.min(progressPercentage, 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {paidParticipants.length} / {attendingParticipants.length}人 支払い完了
            </Text>
          </View>

          {pendingConfirmation.length > 0 && (
            <View style={styles.pendingAlert}>
              <Text style={styles.pendingAlertIcon}>⚠️</Text>
              <Text style={styles.pendingAlertText}>
                {pendingConfirmation.length}件の確認待ちがあります
              </Text>
            </View>
          )}
        </Card>
      )}

      {/* Context Hint for Payment (Participants) */}
      {!isOrganizer && myParticipation && (
        <ContextHint tooltipId="participant_payment" />
      )}

      {/* My Payment Action (Non-Organizer) */}
      {!isOrganizer && myParticipation && myParticipation.payment_status !== 'paid' && (
        <Card variant="elevated" style={styles.myPaymentCard}>
          <View style={styles.myPaymentHeader}>
            <Text style={styles.myPaymentTitle}>参加費のお支払い</Text>
            <Badge
              label={getPaymentConfig(myParticipation.payment_status).label}
              color={getPaymentConfig(myParticipation.payment_status).color}
              size="md"
            />
          </View>

          <View style={styles.myPaymentAmount}>
            <Text style={styles.myPaymentAmountLabel}>支払い金額</Text>
            <Text style={styles.myPaymentAmountValue}>¥{currentEvent?.fee.toLocaleString()}</Text>
          </View>

          {myParticipation.payment_status === 'pending_confirmation' ? (
            <View style={styles.pendingConfirmationBox}>
              <Text style={styles.pendingConfirmationIcon}>⏳</Text>
              <Text style={styles.pendingConfirmationText}>
                主催者の確認をお待ちください
              </Text>
            </View>
          ) : (
            <Button
              title="送金を報告する"
              onPress={handleReportPayment}
              fullWidth
              size="lg"
            />
          )}
        </Card>
      )}

      {/* Payment Link Modal - Bottom Sheet Style */}
      <Modal
        visible={showPaymentLinkModal}
        transparent
        animationType="none"
        onRequestClose={closePaymentModal}
      >
        <View style={styles.paymentModalOverlay}>
          <Animated.View style={[styles.paymentModalBackdrop, { opacity: paymentBackdropOpacity }]}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={closePaymentModal}
            />
          </Animated.View>
          <Animated.View style={[styles.paymentModalContainer, { transform: [{ translateY: paymentModalTranslateY }] }]}>
            {/* Swipeable handle area */}
            <View {...paymentPanResponder.panHandlers} style={styles.paymentModalHandleArea}>
              <View style={styles.paymentModalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>支払い情報を設定</Text>
                <TouchableOpacity
                  onPress={closePaymentModal}
                  style={styles.modalCloseButton}
                >
                  <X size={24} color={colors.gray[500]} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>支払い方法</Text>
                <View style={styles.paymentTypeOptions}>
                  {PAYMENT_TYPE_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        styles.paymentTypeOption,
                        selectedPaymentType === option.key && styles.paymentTypeOptionActive,
                      ]}
                      onPress={() => setSelectedPaymentType(option.key)}
                    >
                      <Text style={styles.paymentTypeIcon}>{option.icon}</Text>
                      <Text
                        style={[
                          styles.paymentTypeLabel,
                          selectedPaymentType === option.key && styles.paymentTypeLabelActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {selectedPaymentType === 'other' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>ラベル名</Text>
                  <TextInput
                    style={styles.textInput}
                    value={customLabelInput}
                    onChangeText={setCustomLabelInput}
                    placeholder="例: Kyash、楽天Pay"
                    placeholderTextColor={colors.gray[400]}
                  />
                </View>
              )}

              {selectedPaymentType === 'paypay' ? (
                // PayPayの場合はURL入力
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>送金リンクURL</Text>
                  <TextInput
                    style={styles.textInput}
                    value={paymentLinkInput}
                    onChangeText={setPaymentLinkInput}
                    placeholder="https://pay.paypay.ne.jp/..."
                    placeholderTextColor={colors.gray[400]}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                  />
                </View>
              ) : (
                // 銀行振込・その他の場合は詳細テキスト入力
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    {selectedPaymentType === 'bank' ? '振込先口座情報' : '支払い詳細'}
                  </Text>
                  <TextInput
                    style={[styles.textInput, styles.textInputMultiline]}
                    value={paymentLinkInput}
                    onChangeText={setPaymentLinkInput}
                    placeholder={selectedPaymentType === 'bank'
                      ? "例:\n銀行名: ○○銀行\n支店名: △△支店\n口座種別: 普通\n口座番号: 1234567\n口座名義: ヤマダ タロウ"
                      : "支払い方法の詳細を入力してください"
                    }
                    placeholderTextColor={colors.gray[400]}
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                  />
                </View>
              )}

              <Text style={styles.modalHint}>
                {selectedPaymentType === 'paypay'
                  ? 'PayPayの送金リンクを設定すると、参加者がタップして送金ページを開けます。'
                  : '入力した情報は参加者の「集金」タブに表示されます。口座情報などをコピーできます。'
                }
              </Text>
            </View>

            <View style={styles.modalFooter}>
              {currentEvent?.payment_link && (
                <TouchableOpacity
                  style={styles.modalDeleteButton}
                  onPress={handleRemovePaymentLink}
                  disabled={isSavingLink}
                >
                  <Trash2 size={18} color={colors.error} />
                </TouchableOpacity>
              )}
              <View style={styles.modalFooterButtons}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={closePaymentModal}
                  disabled={isSavingLink}
                >
                  <Text style={styles.modalCancelButtonText}>キャンセル</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalSaveButton,
                    isSavingLink && styles.modalSaveButtonDisabled,
                  ]}
                  onPress={handleSavePaymentLink}
                  disabled={isSavingLink}
                >
                  <Text style={styles.modalSaveButtonText}>
                    {isSavingLink ? '保存中...' : '保存'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Payment List */}
      <View style={styles.paymentListHeader}>
        <Text style={styles.paymentListTitle}>支払い状況一覧</Text>
      </View>

      {/* Pending Confirmation (Priority for Organizer) */}
      {isOrganizer && pendingConfirmation.length > 0 && (
        <View style={styles.paymentGroup}>
          <View style={styles.paymentGroupHeader}>
            <View style={[styles.groupIndicator, { backgroundColor: colors.warning }]} />
            <Text style={styles.paymentGroupTitle}>確認待ち</Text>
            <Text style={styles.paymentGroupCount}>{pendingConfirmation.length}人</Text>
          </View>
          {pendingConfirmation.map((participant) => {
            const displayName = participant.display_name || participant.user?.display_name || '名前未設定';
            const avatarUrl = participant.user?.avatar_url;
            return (
              <View key={participant.id} style={styles.paymentItem}>
                <View style={styles.paymentItemLeft}>
                  <Avatar
                    name={displayName}
                    imageUrl={avatarUrl || undefined}
                    size="md"
                  />
                  <View style={styles.paymentItemInfo}>
                    <Text style={styles.paymentItemName}>
                      {displayName}
                    </Text>
                    <View style={styles.paymentItemBadges}>
                      <Badge label="確認待ち" color="warning" size="sm" variant="soft" />
                      {participant.is_manual && (
                        <Badge label="手動" color="default" size="sm" variant="soft" />
                      )}
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.confirmPaymentButton}
                  onPress={() => handleConfirmPayment(participant.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.confirmPaymentButtonText}>承認</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}

      {/* Paid */}
      {paidParticipants.length > 0 && (
        <View style={styles.paymentGroup}>
          <View style={styles.paymentGroupHeader}>
            <View style={[styles.groupIndicator, { backgroundColor: colors.success }]} />
            <Text style={styles.paymentGroupTitle}>支払い済み</Text>
            <Text style={styles.paymentGroupCount}>{paidParticipants.length}人</Text>
          </View>
          {paidParticipants.map((participant) => {
            const displayName = participant.display_name || participant.user?.display_name || '名前未設定';
            const avatarUrl = participant.user?.avatar_url;
            return (
              <View key={participant.id} style={styles.paymentItem}>
                <View style={styles.paymentItemLeft}>
                  <Avatar
                    name={displayName}
                    imageUrl={avatarUrl || undefined}
                    size="md"
                  />
                  <View style={styles.paymentItemInfo}>
                    <Text style={styles.paymentItemName}>
                      {displayName}
                    </Text>
                    <View style={styles.paymentItemBadges}>
                      <Badge label="支払済" color="success" size="sm" variant="soft" />
                      {participant.is_manual && (
                        <Badge label="手動" color="default" size="sm" variant="soft" />
                      )}
                    </View>
                  </View>
                </View>
                <View style={styles.paymentItemRight}>
                  <Text style={styles.paidAmount}>¥{currentEvent?.fee.toLocaleString()}</Text>
                  {isOrganizer && (
                    <TouchableOpacity
                      style={styles.revertPaymentButton}
                      onPress={() => handleRevertPayment(participant.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.revertPaymentButtonText}>取消</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Unpaid */}
      {participants.filter((p) => p.payment_status === 'unpaid' && p.attendance_status === 'attending').length > 0 && (
        <View style={styles.paymentGroup}>
          <View style={styles.paymentGroupHeader}>
            <View style={[styles.groupIndicator, { backgroundColor: colors.gray[400] }]} />
            <Text style={styles.paymentGroupTitle}>未払い</Text>
            <Text style={styles.paymentGroupCount}>
              {participants.filter((p) => p.payment_status === 'unpaid' && p.attendance_status === 'attending').length}人
            </Text>
          </View>
          {participants
            .filter((p) => p.payment_status === 'unpaid' && p.attendance_status === 'attending')
            .map((participant) => {
              const displayName = participant.display_name || participant.user?.display_name || '名前未設定';
              const avatarUrl = participant.user?.avatar_url;
              return (
                <View key={participant.id} style={styles.paymentItem}>
                  <View style={styles.paymentItemLeft}>
                    <Avatar
                      name={displayName}
                      imageUrl={avatarUrl || undefined}
                      size="md"
                    />
                    <View style={styles.paymentItemInfo}>
                      <Text style={styles.paymentItemName}>
                        {displayName}
                      </Text>
                      <View style={styles.paymentItemBadges}>
                        <Badge label="未払い" color="default" size="sm" variant="soft" />
                        {participant.is_manual && (
                          <Badge label="手動" color="default" size="sm" variant="soft" />
                        )}
                      </View>
                    </View>
                  </View>
                  {isOrganizer && (
                    <TouchableOpacity
                      style={styles.markPaidButton}
                      onPress={() => handleConfirmPayment(participant.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.markPaidButtonText}>集金済み</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
        </View>
      )}
    </ScrollView>
  );
};

export const EventDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { eventId } = route.params;
  const { currentEvent, fetchEventById, deleteEvent, clearCurrentEvent } = useEventStore();
  const { user } = useAuthStore();
  const { activeTimer } = useTimerStore();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const [showReminderModal, setShowReminderModal] = React.useState(false);
  const [showTimerModal, setShowTimerModal] = React.useState(false);

  // Timer modal swipe-to-dismiss
  const timerModalTranslateY = useRef(new Animated.Value(0)).current;
  const timerBackdropOpacity = useRef(new Animated.Value(0)).current;

  // Animate modal open
  useEffect(() => {
    if (showTimerModal) {
      // Reset position and start animations
      timerModalTranslateY.setValue(300);
      Animated.parallel([
        Animated.timing(timerBackdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(timerModalTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
      ]).start();
    }
  }, [showTimerModal]);

  const closeTimerModal = useCallback(() => {
    Animated.parallel([
      Animated.timing(timerModalTranslateY, {
        toValue: 500,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(timerBackdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowTimerModal(false);
      timerModalTranslateY.setValue(0);
    });
  }, []);

  const timerPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to vertical swipes
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && gestureState.dy > 0;
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow downward movement
        if (gestureState.dy > 0) {
          timerModalTranslateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        // If swiped down more than 100px or velocity is high, close the modal
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          Animated.parallel([
            Animated.timing(timerModalTranslateY, {
              toValue: 500,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(timerBackdropOpacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(() => {
            setShowTimerModal(false);
            timerModalTranslateY.setValue(0);
          });
        } else {
          // Snap back
          Animated.spring(timerModalTranslateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 10,
          }).start();
        }
      },
    })
  ).current;

  // タイマーがこのイベントでアクティブかどうか
  const isTimerActive = activeTimer?.eventId === eventId && (activeTimer?.isRunning || activeTimer?.isPrepared);
  const isTimerRunning = activeTimer?.eventId === eventId && activeTimer?.isRunning;

  useEffect(() => {
    fetchEventById(eventId);
    return () => clearCurrentEvent();
  }, [eventId]);

  useEffect(() => {
    if (currentEvent) {
      navigation.setOptions({
        title: currentEvent.name,
        headerRight: () =>
          currentEvent.organizer_id === user?.id ? (
            <View style={styles.headerButtons}>
              {isTimerRunning ? (
                <TouchableOpacity
                  onPress={() => setShowTimerModal(true)}
                  style={styles.headerTimerButton}
                >
                  <Clock size={16} color={colors.white} />
                  <Text style={styles.headerTimerText}>
                    {formatTime(activeTimer?.remainingTime || 0)}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => setShowTimerModal(true)}
                  style={[styles.headerButton, isTimerActive && styles.headerButtonActive]}
                >
                  <Clock size={20} color={isTimerActive ? colors.primary : colors.gray[600]} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => setShowReminderModal(true)}
                style={styles.headerButton}
              >
                <Bell size={20} color={colors.gray[600]} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('EventEdit', { eventId })}
                style={styles.headerButton}
              >
                <Edit size={20} color={colors.gray[600]} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  const handleDelete = () => {
                    deleteEvent(eventId)
                      .then(() => {
                        navigation.goBack();
                      })
                      .catch((error: any) => {
                        const errorMessage = error.message || '削除に失敗しました';
                        if (Platform.OS === 'web') {
                          window.alert(`エラー: ${errorMessage}`);
                        } else {
                          Alert.alert('エラー', errorMessage);
                        }
                      });
                  };

                  if (Platform.OS === 'web') {
                    const confirmed = window.confirm('このイベントを削除しますか？この操作は取り消せません。');
                    if (confirmed) {
                      handleDelete();
                    }
                  } else {
                    Alert.alert(
                      'イベントを削除',
                      'このイベントを削除しますか？この操作は取り消せません。',
                      [
                        { text: 'キャンセル', style: 'cancel' },
                        {
                          text: '削除',
                          style: 'destructive',
                          onPress: handleDelete,
                        },
                      ]
                    );
                  }
                }}
                style={styles.headerButton}
              >
                <Trash2 size={20} color={colors.error} />
              </TouchableOpacity>
            </View>
          ) : (
            // Show timer and reminder button for participants
            <View style={styles.headerButtons}>
              {isTimerRunning ? (
                <TouchableOpacity
                  onPress={() => setShowTimerModal(true)}
                  style={styles.headerTimerButton}
                >
                  <Clock size={16} color={colors.white} />
                  <Text style={styles.headerTimerText}>
                    {formatTime(activeTimer?.remainingTime || 0)}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => setShowTimerModal(true)}
                  style={[styles.headerButton, isTimerActive && styles.headerButtonActive]}
                >
                  <Clock size={20} color={isTimerActive ? colors.primary : colors.gray[600]} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => setShowReminderModal(true)}
                style={styles.headerButton}
              >
                <Bell size={20} color={colors.gray[600]} />
              </TouchableOpacity>
            </View>
          ),
      });
    }
  }, [currentEvent, user, navigation, eventId, deleteEvent, isTimerActive, isTimerRunning, activeTimer?.remainingTime]);

  if (!currentEvent) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingSpinner}>
          <Loader size={36} color={colors.primary} />
        </View>
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  return (
    <>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.gray[400],
          tabBarIndicatorStyle: {
            backgroundColor: colors.primary,
            height: 3,
            borderRadius: 1.5,
          },
          tabBarLabelStyle: {
            fontSize: typography.fontSize.sm,
            fontWeight: '600',
            textTransform: 'none',
          },
          tabBarStyle: {
            backgroundColor: colors.white,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: colors.gray[100],
          },
          tabBarPressColor: colors.primarySoft,
          tabBarScrollEnabled: true,
          tabBarItemStyle: {
            width: 'auto',
            paddingHorizontal: spacing.md,
          },
        }}
      >
        <Tab.Screen name="Info" options={{ title: '情報' }}>
          {() => <EventInfoTab eventId={eventId} />}
        </Tab.Screen>
        <Tab.Screen name="Participants" options={{ title: '参加者' }}>
          {() => <ParticipantsTab eventId={eventId} />}
        </Tab.Screen>
        <Tab.Screen name="Payment" options={{ title: '集金' }}>
          {() => <PaymentTab eventId={eventId} />}
        </Tab.Screen>
        <Tab.Screen name="Teams" options={{ title: 'チーム' }}>
          {() => <TeamsTab eventId={eventId} />}
        </Tab.Screen>
        <Tab.Screen name="Matches" options={{ title: '対戦表' }}>
          {() => <MatchesTab eventId={eventId} />}
        </Tab.Screen>
      </Tab.Navigator>

      <ReminderModal
        visible={showReminderModal}
        onClose={() => setShowReminderModal(false)}
        event={currentEvent}
        onSuccess={(message) => showToast(message, 'success')}
        onError={(message) => showToast(message, 'error')}
      />

      {/* Timer Modal - Bottom Sheet Style with swipe to dismiss */}
      <Modal
        visible={showTimerModal}
        animationType="none"
        transparent={true}
        onRequestClose={closeTimerModal}
      >
        <View style={styles.timerModalOverlay}>
          <Animated.View
            style={[
              styles.timerModalBackdrop,
              { opacity: timerBackdropOpacity },
            ]}
          >
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={closeTimerModal}
            />
          </Animated.View>
          <Animated.View
            style={[
              styles.timerModalContainer,
              { transform: [{ translateY: timerModalTranslateY }] },
            ]}
          >
            {/* Swipeable handle area */}
            <View {...timerPanResponder.panHandlers} style={styles.timerModalHandleArea}>
              <View style={styles.timerModalHandle} />
              <View style={styles.timerModalHeader}>
                <Text style={styles.timerModalTitle}>タイマー</Text>
                <TouchableOpacity
                  onPress={closeTimerModal}
                  style={styles.timerModalCloseButton}
                >
                  <X size={22} color={colors.gray[500]} />
                </TouchableOpacity>
              </View>
            </View>
            <TimerTab eventId={eventId} onClose={closeTimerModal} />
          </Animated.View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingSpinner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  loadingIcon: {
    fontSize: 36,
  },
  loadingText: {
    fontSize: typography.fontSize.base,
    color: colors.gray[500],
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: spacing.sm,
    marginRight: spacing.xs,
  },
  headerButtonActive: {
    backgroundColor: colors.primarySoft,
    borderRadius: borderRadius.md,
  },
  headerButtonText: {
    fontSize: 20,
  },
  tabContent: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabContentContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  statCardPrimary: {
    borderTopWidth: 3,
    borderTopColor: colors.primary,
  },
  statCardSuccess: {
    borderTopWidth: 3,
    borderTopColor: colors.success,
  },
  statCardWarning: {
    borderTopWidth: 3,
    borderTopColor: colors.warning,
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  statIcon: {
    fontSize: 16,
  },
  statValue: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: colors.primary,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[500],
    marginTop: 2,
  },

  // Detail Card
  detailCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  cardHeaderIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  cardHeaderIconStyle: {
    marginRight: spacing.sm,
  },
  cardHeaderTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.gray[900],
  },
  detailItem: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  detailItemHalf: {
    flex: 1,
  },
  detailRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  detailIconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  detailIcon: {
    fontSize: 16,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[500],
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: typography.fontSize.base,
    color: colors.gray[900],
    fontWeight: '500',
  },
  detailSubValue: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    marginTop: 2,
  },
  detailValueHighlight: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.primary,
  },
  detailValueMuted: {
    fontSize: typography.fontSize.base,
    color: colors.gray[500],
  },

  // Invite Card
  inviteCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  inviteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  inviteTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.gray[900],
  },
  inviteSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    marginTop: 2,
  },
  inviteBadge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  inviteBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: colors.primary,
  },
  codeContainer: {
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.gray[100],
    borderStyle: 'dashed',
  },
  codeText: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 6,
  },
  copyIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  copyHint: {
    fontSize: typography.fontSize.xs,
    color: colors.primary,
  },
  inviteButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  inviteButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  inviteButtonSecondaryText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.primary,
  },
  inviteButtonPrimary: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
    ...shadows.primary,
  },
  inviteButtonPrimaryText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.white,
  },
  buttonIcon: {
    fontSize: 16,
  },

  // Password Card
  passwordCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  passwordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  passwordIconStyle: {
    marginRight: spacing.md,
  },
  passwordTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.gray[900],
  },
  passwordSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
  },
  passwordDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  passwordLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    marginRight: spacing.xs,
  },
  passwordValue: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 1,
  },

  // Join Event Card
  joinEventCard: {
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  joinEventIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  joinEventTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  joinEventMessage: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    textAlign: 'center',
    marginBottom: spacing.lg,
  },

  // My Status Card
  myStatusCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  myStatusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  myStatusTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  myStatusTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.gray[900],
  },
  organizerBadge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  organizerBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: colors.primary,
  },
  statusButtonsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statusButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.gray[50],
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  statusButtonIcon: {
    fontSize: 20,
    color: colors.gray[400],
    marginBottom: 4,
  },
  statusButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.gray[500],
  },

  // Participant Summary
  participantSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: spacing.xs,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryCount: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[600],
    marginTop: spacing.xs,
    textAlign: 'center',
  },

  // Participant Groups
  participantGroup: {
    marginBottom: spacing.lg,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  groupIndicator: {
    width: 4,
    height: 16,
    borderRadius: 2,
    marginRight: spacing.sm,
  },
  groupTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.gray[700],
    flex: 1,
  },
  groupCount: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
  },

  // Participant Card
  participantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.xs,
  },
  participantInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  participantName: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: colors.gray[900],
  },

  // Payment Summary Card
  paymentSummaryCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  paymentSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  paymentSummaryTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.gray[900],
  },
  paymentAmounts: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  paymentAmountItem: {
    flex: 1,
    alignItems: 'center',
  },
  paymentAmountDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.gray[200],
    marginHorizontal: spacing.md,
  },
  paymentAmountLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    marginBottom: spacing.xs,
  },
  paymentAmountValue: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: colors.gray[900],
  },
  progressBarContainer: {
    marginBottom: spacing.md,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: borderRadius.full,
  },
  progressText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    textAlign: 'center',
  },
  pendingAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningSoft,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.sm,
  },
  pendingAlertIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  pendingAlertText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.warning,
  },

  // My Payment Card
  myPaymentCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  myPaymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  myPaymentTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.gray[900],
  },
  myPaymentAmount: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.xl,
  },
  myPaymentAmountLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    marginBottom: spacing.xs,
  },
  myPaymentAmountValue: {
    fontSize: typography.fontSize['4xl'],
    fontWeight: '700',
    color: colors.gray[900],
  },
  pendingConfirmationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.warningSoft,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  pendingConfirmationIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  pendingConfirmationText: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: colors.warning,
  },

  // Payment List
  paymentListHeader: {
    marginBottom: spacing.md,
  },
  paymentListTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.gray[900],
  },
  paymentGroup: {
    marginBottom: spacing.lg,
  },
  paymentGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  paymentGroupTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.gray[700],
    flex: 1,
  },
  paymentGroupCount: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.xs,
  },
  paymentItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentItemInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  paymentItemName: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: colors.gray[900],
    marginBottom: 4,
  },
  paymentItemBadges: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  confirmPaymentButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    ...shadows.primary,
  },
  confirmPaymentButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.white,
  },
  markPaidButton: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  markPaidButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.white,
  },
  paymentItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  revertPaymentButton: {
    backgroundColor: colors.gray[200],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  revertPaymentButtonText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '500',
    color: colors.gray[600],
  },
  paidAmount: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.success,
  },

  // Status Control
  statusControlCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  statusControlHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusControlTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.gray[900],
  },
  statusToggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.lg,
    padding: 4,
  },
  statusToggleButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: 'transparent',
  },
  statusToggleText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.gray[500],
  },
  statusToggleTextActive: {
    color: colors.white,
    fontWeight: '600',
  },

  // Option Display (Skill Level, Gender)
  optionDisplaySection: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  optionDisplayLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.gray[600],
    marginBottom: spacing.sm,
  },
  optionBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  optionBadge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  optionBadgeText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: '500',
  },

  // Profile Section (Skill Level, Gender selection)
  profileSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  profileSectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.gray[600],
    marginBottom: spacing.sm,
  },
  profileOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  profileOptionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.gray[100],
    borderWidth: 2,
    borderColor: 'transparent',
  },
  profileOptionButtonActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  profileOptionText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    fontWeight: '500',
  },
  profileOptionTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },

  // Participant Card extended styles
  participantNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  participantBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  participantSmallBadge: {
    backgroundColor: colors.gray[100],
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  participantSmallBadgeText: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[600],
  },
  participantBadgesInline: {
    flexDirection: 'row',
    gap: spacing.xs,
  },

  // Add Participant Button
  addParticipantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  addParticipantIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  addParticipantTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.gray[900],
  },
  addParticipantSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    marginTop: 2,
  },

  // Summary Card
  summaryCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  summaryCardTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.gray[700],
    marginBottom: spacing.md,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.gray[200],
    marginVertical: spacing.md,
  },
  summaryIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },

  // Attendance Stats Grid (Organizer View)
  attendanceStatsGrid: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  attendanceStatsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attendanceStatsHeaderTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.gray[900],
  },
  addParticipantIconButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendanceStatsColumn: {
    marginBottom: spacing.xs,
  },
  attendanceStatsTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: colors.gray[500],
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  attendanceStatsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  attendanceStatItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  attendanceStatValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
  },
  attendanceStatLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[600],
    marginTop: 2,
  },
  attendanceStatsDivider: {
    height: 1,
    backgroundColor: colors.gray[200],
    marginVertical: spacing.md,
  },

  // Check-in Buttons
  checkInButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  checkInButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  checkInButtonPresent: {
    backgroundColor: colors.white,
    borderColor: colors.success,
  },
  checkInButtonAbsent: {
    backgroundColor: colors.white,
    borderColor: colors.error,
  },
  checkInButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkInButtonText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: colors.gray[700],
  },
  checkInButtonTextActive: {
    color: colors.white,
  },

  // Compact Check-in Buttons
  checkInButtonsCompact: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  checkInButtonCompact: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.gray[300],
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkInButtonCompactActive: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  checkInButtonCompactAbsent: {
    borderColor: colors.gray[300],
  },
  checkInButtonCompactAbsentActive: {
    backgroundColor: colors.error,
    borderColor: colors.error,
  },
  checkInButtonCompactText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.gray[400],
  },
  checkInButtonCompactTextActive: {
    color: colors.white,
  },
  checkInButtonCompactAbsentTextActive: {
    color: colors.white,
  },

  // Check-in Buttons with Label
  checkInButtonWithLabel: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.gray[300],
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkInButtonWithLabelActive: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  checkInButtonWithLabelAbsent: {
    borderColor: colors.gray[300],
  },
  checkInButtonWithLabelAbsentActive: {
    backgroundColor: colors.error,
    borderColor: colors.error,
  },
  checkInButtonLabelText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: colors.gray[600],
  },
  checkInButtonLabelTextActive: {
    color: colors.white,
  },
  checkInButtonLabelTextAbsentActive: {
    color: colors.white,
  },

  // Actual Attendance Badge
  actualAttendanceBadge: {
    marginTop: spacing.xs,
  },

  // Payment Link Card
  paymentLinkCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  paymentLinkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  paymentLinkTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  paymentLinkTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.gray[900],
  },
  paymentLinkEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primarySoft,
  },
  paymentLinkEditText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  paymentLinkDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
  },
  paymentLinkInfo: {
    flex: 1,
  },
  paymentLinkLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: 2,
  },
  paymentLinkUrl: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
  },
  paymentLinkOpenButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.primary,
  },
  paymentLinkEmpty: {
    backgroundColor: colors.gray[50],
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  paymentLinkEmptyText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    textAlign: 'center',
    lineHeight: 20,
  },
  paymentLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  paymentLinkButtonContent: {
    flex: 1,
  },
  paymentLinkButtonLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.primary,
  },
  paymentLinkButtonHint: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    marginTop: 2,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    width: '100%',
    maxWidth: 400,
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.gray[900],
  },
  modalCloseButton: {
    padding: spacing.xs,
  },
  modalBody: {
    padding: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.gray[700],
    marginBottom: spacing.xs,
  },
  textInput: {
    backgroundColor: colors.gray[50],
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.gray[900],
  },
  textInputMultiline: {
    minHeight: 120,
    paddingTop: spacing.md,
  },
  paymentDetailsText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[700],
    lineHeight: 20,
  },
  paymentDetailsContainer: {
    backgroundColor: colors.gray[50],
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  paymentDetailsLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: spacing.sm,
  },
  paymentDetailsContent: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[700],
    lineHeight: 22,
  },
  modalHint: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  modalDeleteButton: {
    padding: spacing.sm,
  },
  modalFooterButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCancelButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.gray[100],
  },
  modalCancelButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.gray[600],
  },
  modalSaveButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
    ...shadows.primary,
  },
  modalSaveButtonDisabled: {
    opacity: 0.6,
  },
  modalSaveButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.white,
  },
  // Payment type selector styles
  paymentTypeOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  paymentTypeOption: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.gray[200],
    backgroundColor: colors.white,
  },
  paymentTypeOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  paymentTypeIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  paymentTypeLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.gray[600],
    textAlign: 'center',
  },
  paymentTypeLabelActive: {
    color: colors.primary,
  },

  // Header Timer Button
  headerTimerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
    marginRight: spacing.xs,
  },
  headerTimerText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
    color: colors.white,
    fontVariant: ['tabular-nums'],
  },

  // Timer Modal - Bottom Sheet Style
  timerModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  timerModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  timerModalContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    maxHeight: '70%',
  },
  timerModalHandleArea: {
    // Swipeable area for drag-to-dismiss
  },
  timerModalHandle: {
    width: 36,
    height: 4,
    backgroundColor: colors.gray[300],
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  timerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  timerModalTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.gray[900],
  },
  timerModalCloseButton: {
    padding: spacing.xs,
  },
  // Payment Modal - Bottom Sheet Style
  paymentModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  paymentModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  paymentModalContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    maxHeight: '85%',
  },
  paymentModalHandleArea: {
    // Swipeable area for drag-to-dismiss
  },
  paymentModalHandle: {
    width: 36,
    height: 4,
    backgroundColor: colors.gray[300],
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
});
