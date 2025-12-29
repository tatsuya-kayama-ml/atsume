import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Users,
  Shuffle,
  Scale,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  GripVertical,
  UserMinus,
} from 'lucide-react-native';
import { useTeamStore } from '../../stores/teamStore';
import { useEventStore } from '../../stores/eventStore';
import { useAuthStore } from '../../stores/authStore';
import { Card, Badge, Avatar, Button } from '../common';
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme';

interface TeamsTabProps {
  eventId: string;
}

const TEAM_COUNT_OPTIONS = [2, 3, 4, 5, 6, 7, 8, 9, 10];

export const TeamsTab: React.FC<TeamsTabProps> = ({ eventId }) => {
  const { teams, isLoading, fetchTeams, autoAssignTeams, deleteAllTeams, removeMemberFromTeam } = useTeamStore();
  const { currentEvent, participants, fetchParticipants } = useEventStore();
  const { user } = useAuthStore();

  const [showSettings, setShowSettings] = useState(false);
  const [selectedTeamCount, setSelectedTeamCount] = useState(4);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  const isOrganizer = currentEvent?.organizer_id === user?.id;
  const attendingParticipants = participants.filter((p) => p.attendance_status === 'attending');

  useFocusEffect(
    useCallback(() => {
      fetchTeams(eventId);
      fetchParticipants(eventId);
    }, [eventId])
  );

  const toggleTeamExpanded = (teamId: string) => {
    setExpandedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });
  };

  const handleAutoAssign = async (mode: 'random' | 'balanced') => {
    if (attendingParticipants.length === 0) {
      const message = '参加予定の参加者がいません';
      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert('エラー', message);
      }
      return;
    }

    if (selectedTeamCount > attendingParticipants.length) {
      const message = `チーム数(${selectedTeamCount})が参加者数(${attendingParticipants.length})より多いです`;
      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert('エラー', message);
      }
      return;
    }

    const confirmMessage = teams.length > 0
      ? '既存のチーム分けをリセットして新しく分けますか？'
      : `${selectedTeamCount}チームに分けますか？`;

    const proceed = async () => {
      try {
        await autoAssignTeams(eventId, mode, selectedTeamCount);
        setShowSettings(false);
        // Expand all teams after assignment
        const newExpandedTeams = new Set<string>();
        teams.forEach((t) => newExpandedTeams.add(t.id));
        setExpandedTeams(newExpandedTeams);
      } catch (error: any) {
        const errorMessage = error.message || 'チーム分けに失敗しました';
        if (Platform.OS === 'web') {
          window.alert(errorMessage);
        } else {
          Alert.alert('エラー', errorMessage);
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(confirmMessage)) {
        await proceed();
      }
    } else {
      Alert.alert('チーム分け', confirmMessage, [
        { text: 'キャンセル', style: 'cancel' },
        { text: '実行', onPress: proceed },
      ]);
    }
  };

  const handleDeleteAllTeams = () => {
    const proceed = async () => {
      try {
        await deleteAllTeams(eventId);
      } catch (error: any) {
        const errorMessage = error.message || 'チームの削除に失敗しました';
        if (Platform.OS === 'web') {
          window.alert(errorMessage);
        } else {
          Alert.alert('エラー', errorMessage);
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('すべてのチームを削除しますか？')) {
        proceed();
      }
    } else {
      Alert.alert('チーム削除', 'すべてのチームを削除しますか？', [
        { text: 'キャンセル', style: 'cancel' },
        { text: '削除', style: 'destructive', onPress: proceed },
      ]);
    }
  };

  const handleRemoveMember = (memberId: string, memberName: string) => {
    const proceed = async () => {
      try {
        await removeMemberFromTeam(memberId);
      } catch (error: any) {
        const errorMessage = error.message || 'メンバーの削除に失敗しました';
        if (Platform.OS === 'web') {
          window.alert(errorMessage);
        } else {
          Alert.alert('エラー', errorMessage);
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`${memberName}をチームから外しますか？`)) {
        proceed();
      }
    } else {
      Alert.alert('メンバー削除', `${memberName}をチームから外しますか？`, [
        { text: 'キャンセル', style: 'cancel' },
        { text: '外す', style: 'destructive', onPress: proceed },
      ]);
    }
  };

  const calculateTeamAverageSkill = (members: any[]): number => {
    if (members.length === 0) return 0;
    const total = members.reduce((sum, m) => {
      const skill = m.participant?.skill_level ?? m.participant?.user?.skill_level ?? 3;
      return sum + skill;
    }, 0);
    return total / members.length;
  };

  // Render empty state when no teams exist
  if (teams.length === 0) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => fetchTeams(eventId)}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {isOrganizer ? (
          <Card variant="elevated" style={styles.emptyCard}>
            <View style={styles.emptyIconContainer}>
              <Users size={48} color={colors.gray[300]} />
            </View>
            <Text style={styles.emptyTitle}>チームがありません</Text>
            <Text style={styles.emptyMessage}>
              参加者を自動でチームに分けましょう
            </Text>

            <View style={styles.teamCountSelector}>
              <Text style={styles.teamCountLabel}>チーム数:</Text>
              <View style={styles.teamCountOptions}>
                {TEAM_COUNT_OPTIONS.map((count) => (
                  <TouchableOpacity
                    key={count}
                    style={[
                      styles.teamCountOption,
                      selectedTeamCount === count && styles.teamCountOptionSelected,
                    ]}
                    onPress={() => setSelectedTeamCount(count)}
                  >
                    <Text
                      style={[
                        styles.teamCountOptionText,
                        selectedTeamCount === count && styles.teamCountOptionTextSelected,
                      ]}
                    >
                      {count}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.assignButtons}>
              <Button
                title="ランダム分け"
                onPress={() => handleAutoAssign('random')}
                variant="outline"
                icon={<Shuffle size={18} color={colors.primary} />}
                style={styles.assignButton}
                loading={isLoading}
              />
              <Button
                title="スキル均等分け"
                onPress={() => handleAutoAssign('balanced')}
                icon={<Scale size={18} color={colors.white} />}
                style={styles.assignButton}
                loading={isLoading}
              />
            </View>

            <Text style={styles.participantInfo}>
              参加予定: {attendingParticipants.length}人
            </Text>
          </Card>
        ) : (
          <Card variant="elevated" style={styles.emptyCard}>
            <View style={styles.emptyIconContainer}>
              <Users size={48} color={colors.gray[300]} />
            </View>
            <Text style={styles.emptyTitle}>チームがありません</Text>
            <Text style={styles.emptyMessage}>
              主催者がチーム分けを行うまでお待ちください
            </Text>
          </Card>
        )}
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={() => fetchTeams(eventId)}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      {/* Organizer Controls */}
      {isOrganizer && (
        <Card variant="elevated" style={styles.controlCard}>
          <TouchableOpacity
            style={styles.controlHeader}
            onPress={() => setShowSettings(!showSettings)}
          >
            <Text style={styles.controlTitle}>チーム分け設定</Text>
            {showSettings ? (
              <ChevronUp size={20} color={colors.gray[500]} />
            ) : (
              <ChevronDown size={20} color={colors.gray[500]} />
            )}
          </TouchableOpacity>

          {showSettings && (
            <View style={styles.controlContent}>
              <View style={styles.teamCountSelector}>
                <Text style={styles.teamCountLabel}>チーム数:</Text>
                <View style={styles.teamCountOptions}>
                  {TEAM_COUNT_OPTIONS.map((count) => (
                    <TouchableOpacity
                      key={count}
                      style={[
                        styles.teamCountOption,
                        selectedTeamCount === count && styles.teamCountOptionSelected,
                      ]}
                      onPress={() => setSelectedTeamCount(count)}
                    >
                      <Text
                        style={[
                          styles.teamCountOptionText,
                          selectedTeamCount === count && styles.teamCountOptionTextSelected,
                        ]}
                      >
                        {count}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.assignButtons}>
                <Button
                  title="ランダム"
                  onPress={() => handleAutoAssign('random')}
                  variant="outline"
                  icon={<Shuffle size={16} color={colors.primary} />}
                  style={styles.assignButtonSmall}
                  loading={isLoading}
                />
                <Button
                  title="スキル均等"
                  onPress={() => handleAutoAssign('balanced')}
                  icon={<Scale size={16} color={colors.white} />}
                  style={styles.assignButtonSmall}
                  loading={isLoading}
                />
              </View>

              <TouchableOpacity
                style={styles.deleteAllButton}
                onPress={handleDeleteAllTeams}
              >
                <Trash2 size={16} color={colors.error} />
                <Text style={styles.deleteAllButtonText}>すべてのチームを削除</Text>
              </TouchableOpacity>
            </View>
          )}
        </Card>
      )}

      {/* Team Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{teams.length}</Text>
          <Text style={styles.summaryLabel}>チーム</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            {teams.reduce((sum, t) => sum + t.members.length, 0)}
          </Text>
          <Text style={styles.summaryLabel}>割り当て済み</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            {attendingParticipants.length - teams.reduce((sum, t) => sum + t.members.length, 0)}
          </Text>
          <Text style={styles.summaryLabel}>未割り当て</Text>
        </View>
      </View>

      {/* Teams List */}
      {teams.map((team) => {
        const isExpanded = expandedTeams.has(team.id);
        const averageSkill = calculateTeamAverageSkill(team.members);

        return (
          <Card key={team.id} variant="elevated" style={styles.teamCard}>
            <TouchableOpacity
              style={styles.teamHeader}
              onPress={() => toggleTeamExpanded(team.id)}
            >
              <View style={styles.teamHeaderLeft}>
                <View style={[styles.teamColorIndicator, { backgroundColor: team.color }]} />
                <Text style={styles.teamName}>{team.name}</Text>
                <Badge
                  label={`${team.members.length}人`}
                  color="default"
                  size="sm"
                />
              </View>
              <View style={styles.teamHeaderRight}>
                <Text style={styles.teamSkillAvg}>
                  平均: {averageSkill.toFixed(1)}
                </Text>
                {isExpanded ? (
                  <ChevronUp size={20} color={colors.gray[400]} />
                ) : (
                  <ChevronDown size={20} color={colors.gray[400]} />
                )}
              </View>
            </TouchableOpacity>

            {isExpanded && (
              <View style={styles.teamMembers}>
                {team.members.length === 0 ? (
                  <Text style={styles.noMembersText}>メンバーがいません</Text>
                ) : (
                  team.members.map((member) => {
                    const participant = member.participant;
                    const memberUser = participant?.user;
                    const displayName = memberUser?.display_name || '名前未設定';
                    const skillLevel = participant?.skill_level ?? memberUser?.skill_level ?? 3;

                    return (
                      <View key={member.id} style={styles.memberItem}>
                        <View style={styles.memberInfo}>
                          <Avatar
                            name={displayName}
                            imageUrl={memberUser?.avatar_url ?? undefined}
                            size="sm"
                          />
                          <Text style={styles.memberName}>{displayName}</Text>
                          <Badge
                            label={`Lv.${skillLevel}`}
                            color={skillLevel >= 4 ? 'warning' : skillLevel >= 2 ? 'primary' : 'default'}
                            size="sm"
                          />
                        </View>
                        {isOrganizer && (
                          <TouchableOpacity
                            style={styles.removeMemberButton}
                            onPress={() => handleRemoveMember(member.id, displayName)}
                          >
                            <UserMinus size={16} color={colors.error} />
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })
                )}
              </View>
            )}
          </Card>
        );
      })}

      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: spacing.md,
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  emptyMessage: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  teamCountSelector: {
    width: '100%',
    marginBottom: spacing.md,
  },
  teamCountLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.gray[700],
    marginBottom: spacing.sm,
  },
  teamCountOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  teamCountOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray[100],
    minWidth: 44,
    alignItems: 'center',
  },
  teamCountOptionSelected: {
    backgroundColor: colors.primary,
  },
  teamCountOptionText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.gray[600],
  },
  teamCountOptionTextSelected: {
    color: colors.white,
  },
  assignButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  assignButton: {
    flex: 1,
  },
  assignButtonSmall: {
    flex: 1,
  },
  participantInfo: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    marginTop: spacing.md,
  },
  controlCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  controlHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  controlTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.gray[900],
  },
  controlContent: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  deleteAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    padding: spacing.sm,
  },
  deleteAllButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.error,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  summaryItem: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  summaryValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.primary,
  },
  summaryLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[500],
    marginTop: 2,
  },
  teamCard: {
    marginBottom: spacing.sm,
    padding: 0,
    overflow: 'hidden',
  },
  teamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  teamHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  teamColorIndicator: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  teamName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.gray[900],
  },
  teamHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  teamSkillAvg: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[500],
  },
  teamMembers: {
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
    padding: spacing.md,
    gap: spacing.sm,
  },
  noMembersText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[400],
    textAlign: 'center',
    padding: spacing.md,
  },
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  memberName: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[700],
  },
  removeMemberButton: {
    padding: spacing.xs,
  },
});
