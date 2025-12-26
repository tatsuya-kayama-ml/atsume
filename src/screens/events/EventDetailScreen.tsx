import React, { useEffect, useCallback } from 'react';
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
  Clock,
  Copy,
  Bell,
  BarChart3,
  TrendingUp,
  PieChart,
  UserCheck,
  UserX,
  CircleDollarSign,
} from 'lucide-react-native';
import { useEventStore } from '../../stores/eventStore';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../contexts/ToastContext';
import { Button, Card, Badge, Avatar } from '../../components/common';
import { ReminderModal } from '../../components/events';
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme';
import { RootStackParamList, EventTabParamList, AttendanceStatus } from '../../types';

const { width } = Dimensions.get('window');
const Tab = createMaterialTopTabNavigator<EventTabParamList>();

interface Props {
  navigation: NativeStackNavigationProp<RootStackParamList, 'EventDetail'>;
  route: RouteProp<RootStackParamList, 'EventDetail'>;
}

const formatDateTime = (dateString: string): { date: string; time: string; shortDate: string } => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const weekday = weekdays[date.getDay()];
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return {
    date: `${year}年${month}月${day}日(${weekday})`,
    time: `${hours}:${minutes}`,
    shortDate: `${month}/${day}(${weekday})`,
  };
};

// Status options for the event
const STATUS_OPTIONS = [
  { value: 'open', label: '募集中', color: colors.success },
  { value: 'in_progress', label: '開催中', color: colors.primary },
  { value: 'closed', label: '締切', color: colors.error },
  { value: 'completed', label: '終了', color: colors.gray[500] },
] as const;

// Event Info Tab
const EventInfoTab: React.FC<{ eventId: string }> = ({ eventId }) => {
  const { currentEvent, participants, fetchEventById, fetchParticipants, updateEventStatus, isLoading } = useEventStore();
  const { user } = useAuthStore();
  const { showToast } = useToast();
  const [showStatusPicker, setShowStatusPicker] = React.useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchEventById(eventId);
      fetchParticipants(eventId);
    }, [eventId])
  );

  if (!currentEvent) return null;

  const isOrganizer = currentEvent.organizer_id === user?.id;
  const { date, time } = formatDateTime(currentEvent.date_time);

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateEventStatus(eventId, newStatus as any);
      setShowStatusPicker(false);
      if (Platform.OS === 'web') {
        window.alert('ステータスを更新しました');
      } else {
        Alert.alert('完了', 'ステータスを更新しました');
      }
    } catch (error: any) {
      if (Platform.OS === 'web') {
        window.alert(`エラー: ${error.message}`);
      } else {
        Alert.alert('エラー', error.message);
      }
    }
  };

  const currentStatusConfig = STATUS_OPTIONS.find(s => s.value === currentEvent.status) || STATUS_OPTIONS[0];

  const attendingCount = participants.filter((p) => p.attendance_status === 'attending').length;
  const paidCount = participants.filter((p) => p.payment_status === 'paid').length;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${currentEvent.name}\n\n日時: ${date} ${time}\n場所: ${currentEvent.location}\n参加費: ¥${currentEvent.fee.toLocaleString()}\n\n参加コード: ${currentEvent.event_code}`,
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const handleCopyCode = async () => {
    try {
      await Clipboard.setStringAsync(currentEvent.event_code);
      showToast('招待コードをコピーしました', 'success');
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
      {/* Status Control (Organizer Only) */}
      {isOrganizer && (
        <Card variant="elevated" style={styles.statusControlCard}>
          <View style={styles.statusControlHeader}>
            <Text style={styles.statusControlTitle}>イベントステータス</Text>
            <TouchableOpacity
              style={[styles.currentStatusBadge, { backgroundColor: currentStatusConfig.color + '20' }]}
              onPress={() => setShowStatusPicker(!showStatusPicker)}
              activeOpacity={0.7}
            >
              <View style={[styles.statusDot, { backgroundColor: currentStatusConfig.color }]} />
              <Text style={[styles.currentStatusText, { color: currentStatusConfig.color }]}>
                {currentStatusConfig.label}
              </Text>
              <Text style={styles.statusDropdownIcon}>{showStatusPicker ? '▲' : '▼'}</Text>
            </TouchableOpacity>
          </View>

          {showStatusPicker && (
            <View style={styles.statusOptionsContainer}>
              {STATUS_OPTIONS.map((status) => (
                <TouchableOpacity
                  key={status.value}
                  style={[
                    styles.statusOption,
                    currentEvent.status === status.value && styles.statusOptionActive,
                  ]}
                  onPress={() => handleStatusChange(status.value)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                  <Text style={[
                    styles.statusOptionText,
                    currentEvent.status === status.value && { color: status.color, fontWeight: '600' },
                  ]}>
                    {status.label}
                  </Text>
                  {currentEvent.status === status.value && (
                    <Check size={16} color={status.color} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
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
            <Text style={styles.detailValue}>{date}</Text>
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

      {/* Password Info */}
      {currentEvent.password_hash && isOrganizer && (
        <Card variant="outlined" style={styles.passwordCard}>
          <View style={styles.passwordHeader}>
            <Lock size={20} color={colors.gray[500]} style={styles.passwordIconStyle} />
            <View>
              <Text style={styles.passwordTitle}>参加パスワード設定済み</Text>
              <Text style={styles.passwordSubtitle}>参加時にパスワードが必要です</Text>
            </View>
          </View>
        </Card>
      )}
    </ScrollView>
  );
};

// Participants Tab
const ParticipantsTab: React.FC<{ eventId: string }> = ({ eventId }) => {
  const { participants, currentEvent, fetchParticipants, updateAttendanceStatus, updateParticipantProfile, isLoading } = useEventStore();
  const { user } = useAuthStore();

  useFocusEffect(
    useCallback(() => {
      fetchParticipants(eventId);
    }, [eventId])
  );

  const isOrganizer = currentEvent?.organizer_id === user?.id;

  const getStatusConfig = (status: AttendanceStatus): { color: 'success' | 'error' | 'warning' | 'default'; label: string; icon: string; colorValue: string } => {
    switch (status) {
      case 'attending':
        return { color: 'success', label: '出席', icon: '✓', colorValue: colors.success };
      case 'not_attending':
        return { color: 'error', label: '欠席', icon: '✕', colorValue: colors.error };
      case 'maybe':
        return { color: 'warning', label: '未定', icon: '?', colorValue: colors.warning };
      default:
        return { color: 'default', label: '未回答', icon: '−', colorValue: colors.gray[500] };
    }
  };

  const handleStatusChange = async (participantId: string, status: AttendanceStatus) => {
    try {
      await updateAttendanceStatus(participantId, status);
    } catch (error: any) {
      Alert.alert('エラー', error.message);
    }
  };

  const myParticipation = participants.find((p) => p.user_id === user?.id);

  const attendingParticipants = participants.filter((p) => p.attendance_status === 'attending');
  const maybeParticipants = participants.filter((p) => p.attendance_status === 'maybe');
  const notAttendingParticipants = participants.filter((p) => p.attendance_status === 'not_attending');
  const pendingParticipants = participants.filter((p) => p.attendance_status === 'pending');

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
      {/* My Status Card */}
      {myParticipation && !isOrganizer && (
        <Card variant="elevated" style={styles.myStatusCard}>
          <View style={styles.myStatusHeader}>
            <Text style={styles.myStatusTitle}>あなたの出欠状況</Text>
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

      {/* Summary Stats */}
      <View style={styles.participantSummary}>
        <View style={[styles.summaryItem, { backgroundColor: colors.successSoft }]}>
          <Text style={[styles.summaryCount, { color: colors.success }]}>{attendingParticipants.length}</Text>
          <Text style={styles.summaryLabel}>出席</Text>
        </View>
        <View style={[styles.summaryItem, { backgroundColor: colors.warningSoft }]}>
          <Text style={[styles.summaryCount, { color: colors.warning }]}>{maybeParticipants.length}</Text>
          <Text style={styles.summaryLabel}>未定</Text>
        </View>
        <View style={[styles.summaryItem, { backgroundColor: colors.errorSoft }]}>
          <Text style={[styles.summaryCount, { color: colors.error }]}>{notAttendingParticipants.length}</Text>
          <Text style={styles.summaryLabel}>欠席</Text>
        </View>
        <View style={[styles.summaryItem, { backgroundColor: colors.gray[100] }]}>
          <Text style={[styles.summaryCount, { color: colors.gray[500] }]}>{pendingParticipants.length}</Text>
          <Text style={styles.summaryLabel}>未回答</Text>
        </View>
      </View>

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
            />
          ))}
        </View>
      )}

      {pendingParticipants.length > 0 && (
        <View style={styles.participantGroup}>
          <View style={styles.groupHeader}>
            <View style={[styles.groupIndicator, { backgroundColor: colors.gray[400] }]} />
            <Text style={styles.groupTitle}>未回答</Text>
            <Text style={styles.groupCount}>{pendingParticipants.length}人</Text>
          </View>
          {pendingParticipants.map((participant) => (
            <ParticipantCard
              key={participant.id}
              participant={participant}
              status="pending"
              skillLevelSettings={currentEvent?.skill_level_settings}
              genderSettings={currentEvent?.gender_settings}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
};

// Participant Card Component
const ParticipantCard: React.FC<{
  participant: any;
  status: AttendanceStatus;
  skillLevelSettings?: any;
  genderSettings?: any;
}> = ({ participant, status, skillLevelSettings, genderSettings }) => {
  const displayName = participant.user?.display_name || '名前未設定';
  const avatarUrl = participant.user?.avatar_url;

  // Get skill level label
  const skillLevelLabel = skillLevelSettings?.enabled && participant.skill_level
    ? skillLevelSettings.options?.find((o: any) => o.value === participant.skill_level)?.label
    : null;

  // Get gender label
  const genderLabel = genderSettings?.enabled && participant.gender
    ? genderSettings.options?.find((o: any) => o.value === participant.gender)?.label
    : null;

  return (
    <View style={styles.participantCard}>
      <Avatar name={displayName} imageUrl={avatarUrl} size="md" />
      <View style={styles.participantInfo}>
        <View style={styles.participantNameRow}>
          <Text style={styles.participantName}>{displayName}</Text>
          {participant.payment_status === 'paid' && (
            <Badge label="支払済" color="success" size="sm" variant="soft" />
          )}
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
      </View>
    </View>
  );
};

// Payment Tab
const PaymentTab: React.FC<{ eventId: string }> = ({ eventId }) => {
  const { participants, currentEvent, fetchParticipants, reportPayment, confirmPayment, isLoading } = useEventStore();
  const { user } = useAuthStore();

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
      Alert.alert('完了', '送金報告を送信しました');
    } catch (error: any) {
      Alert.alert('エラー', error.message);
    }
  };

  const handleConfirmPayment = async (participantId: string, name: string) => {
    Alert.alert(
      '支払い確認',
      `${name}さんの支払いを確認しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '確認する',
          onPress: async () => {
            try {
              await confirmPayment(participantId);
            } catch (error: any) {
              Alert.alert('エラー', error.message);
            }
          },
        },
      ]
    );
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
          {pendingConfirmation.map((participant) => (
            <View key={participant.id} style={styles.paymentItem}>
              <View style={styles.paymentItemLeft}>
                <Avatar
                  name={participant.user?.display_name || '名前未設定'}
                  imageUrl={participant.user?.avatar_url || undefined}
                  size="md"
                />
                <View style={styles.paymentItemInfo}>
                  <Text style={styles.paymentItemName}>
                    {participant.user?.display_name || '名前未設定'}
                  </Text>
                  <Badge label="確認待ち" color="warning" size="sm" variant="soft" />
                </View>
              </View>
              <TouchableOpacity
                style={styles.confirmPaymentButton}
                onPress={() => handleConfirmPayment(
                  participant.id,
                  participant.user?.display_name || '名前未設定'
                )}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmPaymentButtonText}>確認</Text>
              </TouchableOpacity>
            </View>
          ))}
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
          {paidParticipants.map((participant) => (
            <View key={participant.id} style={styles.paymentItem}>
              <View style={styles.paymentItemLeft}>
                <Avatar
                  name={participant.user?.display_name || '名前未設定'}
                  imageUrl={participant.user?.avatar_url || undefined}
                  size="md"
                />
                <View style={styles.paymentItemInfo}>
                  <Text style={styles.paymentItemName}>
                    {participant.user?.display_name || '名前未設定'}
                  </Text>
                  <Badge label="支払済" color="success" size="sm" variant="soft" />
                </View>
              </View>
              <Text style={styles.paidAmount}>¥{currentEvent?.fee.toLocaleString()}</Text>
            </View>
          ))}
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
            .map((participant) => (
              <View key={participant.id} style={styles.paymentItem}>
                <View style={styles.paymentItemLeft}>
                  <Avatar
                    name={participant.user?.display_name || '名前未設定'}
                    imageUrl={participant.user?.avatar_url || undefined}
                    size="md"
                  />
                  <View style={styles.paymentItemInfo}>
                    <Text style={styles.paymentItemName}>
                      {participant.user?.display_name || '名前未設定'}
                    </Text>
                    <Badge label="未払い" color="default" size="sm" variant="soft" />
                  </View>
                </View>
              </View>
            ))}
        </View>
      )}
    </ScrollView>
  );
};

export const EventDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { eventId } = route.params;
  const { currentEvent, fetchEventById, deleteEvent, duplicateEvent, clearCurrentEvent } = useEventStore();
  const { user } = useAuthStore();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const [showReminderModal, setShowReminderModal] = React.useState(false);

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
              <TouchableOpacity
                onPress={() => setShowReminderModal(true)}
                style={styles.headerButton}
              >
                <Bell size={20} color={colors.gray[600]} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  duplicateEvent(eventId)
                    .then((newEvent) => {
                      if (Platform.OS === 'web') {
                        window.alert('イベントを複製しました');
                      } else {
                        Alert.alert('完了', 'イベントを複製しました');
                      }
                      navigation.replace('EventDetail', { eventId: newEvent.id });
                    })
                    .catch((error: any) => {
                      const errorMessage = error.message || '複製に失敗しました';
                      if (Platform.OS === 'web') {
                        window.alert(`エラー: ${errorMessage}`);
                      } else {
                        Alert.alert('エラー', errorMessage);
                      }
                    });
                }}
                style={styles.headerButton}
              >
                <Copy size={20} color={colors.gray[600]} />
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
            // Show reminder button for participants
            <TouchableOpacity
              onPress={() => setShowReminderModal(true)}
              style={styles.headerButton}
            >
              <Bell size={20} color={colors.gray[600]} />
            </TouchableOpacity>
          ),
      });
    }
  }, [currentEvent, user, navigation, eventId, deleteEvent]);

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
      </Tab.Navigator>

      <ReminderModal
        visible={showReminderModal}
        onClose={() => setShowReminderModal(false)}
        event={currentEvent}
        onSuccess={(message) => showToast(message, 'success')}
        onError={(message) => showToast(message, 'error')}
      />
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
  myStatusTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.gray[900],
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
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  summaryItem: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  summaryCount: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[500],
    marginTop: 2,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: spacing.sm,
  },
  paymentItemName: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: colors.gray[900],
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
  currentStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  currentStatusText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    marginRight: spacing.xs,
  },
  statusDropdownIcon: {
    fontSize: 10,
    color: colors.gray[500],
  },
  statusOptionsContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xs,
  },
  statusOptionActive: {
    backgroundColor: colors.gray[50],
  },
  statusOptionText: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.gray[700],
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
});
