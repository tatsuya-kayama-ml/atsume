import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Modal,
  Switch,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Users,
  Shuffle,
  Trash2,
  ChevronDown,
  ChevronUp,
  UserMinus,
  Edit3,
  ArrowRight,
  X,
  Check,
  UserPlus,
  Settings2,
} from 'lucide-react-native';
import { useTeamStore, TeamAssignmentOptions } from '../../stores/teamStore';
import { useEventStore } from '../../stores/eventStore';
import { useAuthStore } from '../../stores/authStore';
import { Card, Badge, Avatar, Button, ContextHint } from '../common';
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme';
import { showAlert, confirmAlert } from '../../utils/alert';

interface TeamsTabProps {
  eventId: string;
}

const TEAM_COUNT_OPTIONS = [2, 3, 4, 5, 6, 7, 8, 9, 10];

export const TeamsTab: React.FC<TeamsTabProps> = ({ eventId }) => {
  const { teams, isLoading: teamLoading, fetchTeams, autoAssignTeams, deleteAllTeams, removeMemberFromTeam, updateTeam, moveMemberToTeam, addMemberToTeam } = useTeamStore();
  const { currentEvent, participants, fetchParticipants } = useEventStore();
  const { user } = useAuthStore();

  const [showSettings, setShowSettings] = useState(false);
  const [selectedTeamCount, setSelectedTeamCount] = useState(4);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // チーム分け対象の選択: 'attending' = 参加予定者, 'checked_in' = 来ている参加者
  const [assignTarget, setAssignTarget] = useState<'attending' | 'checked_in'>('attending');

  // チーム名編集用state
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editingTeamName, setEditingTeamName] = useState('');

  // メンバー移動用state
  const [movingMember, setMovingMember] = useState<{ memberId: string; memberName: string; currentTeamId: string } | null>(null);

  // メンバー追加用state
  const [addingToTeamId, setAddingToTeamId] = useState<string | null>(null);

  // 未割り当てメンバーからチーム選択用state
  const [assigningParticipant, setAssigningParticipant] = useState<{ id: string; name: string } | null>(null);

  // チーム分け条件オプション
  const [balanceSkill, setBalanceSkill] = useState(false);
  const [balanceGender, setBalanceGender] = useState(false);

  const isOrganizer = currentEvent?.organizer_id === user?.id;

  // イベントの設定を確認
  const hasSkillSettings = currentEvent?.skill_level_settings?.enabled ?? false;
  const hasGenderSettings = currentEvent?.gender_settings?.enabled ?? false;
  const attendingParticipants = participants.filter((p) => p.attendance_status === 'attending');
  const checkedInParticipants = participants.filter((p) => p.check_in_status === 'checked_in');

  // 既にチームに割り当てられているparticipant IDのセット
  const assignedParticipantIds = new Set(
    teams.flatMap((t) => t.members.map((m) => m.participant_id))
  );

  // 未割り当ての参加者
  const unassignedParticipants = attendingParticipants.filter(
    (p) => !assignedParticipantIds.has(p.id)
  );

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        try {
          await Promise.all([
            fetchTeams(eventId).catch(() => {}),
            fetchParticipants(eventId).catch(() => {}),
          ]);
        } catch {
          // Ignore errors - they're handled in stores
        }
      };
      loadData();
    }, [eventId])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchTeams(eventId).catch(() => {}),
        fetchParticipants(eventId).catch(() => {}),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

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

  const handleAutoAssign = async () => {
    const targetParticipants = assignTarget === 'checked_in' ? checkedInParticipants : attendingParticipants;
    const targetLabel = assignTarget === 'checked_in' ? '来ている参加者' : '参加予定者';

    if (targetParticipants.length === 0) {
      showAlert('エラー', `${targetLabel}がいません`);
      return;
    }

    if (selectedTeamCount > targetParticipants.length) {
      showAlert('エラー', `チーム数(${selectedTeamCount})が${targetLabel}数(${targetParticipants.length})より多いです`);
      return;
    }

    // 条件の説明を作成
    const conditions: string[] = [];
    if (balanceSkill) conditions.push('スキル均等');
    if (balanceGender) conditions.push('男女均等');
    const conditionText = conditions.length > 0 ? `（${conditions.join('・')}）` : '（ランダム）';

    const confirmMessage = teams.length > 0
      ? `既存のチーム分けをリセットして、${targetLabel}(${targetParticipants.length}人)で新しく分けますか？\n\n条件: ${conditionText}`
      : `${targetLabel}(${targetParticipants.length}人)を${selectedTeamCount}チームに分けますか？\n\n条件: ${conditionText}`;

    const confirmed = await confirmAlert('チーム分け', confirmMessage, '実行');
    if (!confirmed) return;

    try {
      const options: TeamAssignmentOptions = {
        balanceSkill,
        balanceGender,
      };
      await autoAssignTeams(eventId, selectedTeamCount, assignTarget, options);
      setShowSettings(false);
      // Expand all teams after assignment
      const newExpandedTeams = new Set<string>();
      teams.forEach((t) => newExpandedTeams.add(t.id));
      setExpandedTeams(newExpandedTeams);
    } catch (error: any) {
      showAlert('エラー', error.message || 'チーム分けに失敗しました');
    }
  };

  const handleDeleteAllTeams = async () => {
    const confirmed = await confirmAlert('チーム削除', 'すべてのチームを削除しますか？', '削除');
    if (!confirmed) return;

    try {
      await deleteAllTeams(eventId);
    } catch (error: any) {
      showAlert('エラー', error.message || 'チームの削除に失敗しました');
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    const confirmed = await confirmAlert('メンバー削除', `${memberName}をチームから外しますか？`, '外す');
    if (!confirmed) return;

    try {
      await removeMemberFromTeam(memberId);
    } catch (error: any) {
      showAlert('エラー', error.message || 'メンバーの削除に失敗しました');
    }
  };

  // チーム名編集
  const handleStartEditTeamName = (teamId: string, currentName: string) => {
    setEditingTeamId(teamId);
    setEditingTeamName(currentName);
  };

  const handleSaveTeamName = async () => {
    if (!editingTeamId || !editingTeamName.trim()) return;

    try {
      await updateTeam(editingTeamId, { name: editingTeamName.trim() });
      setEditingTeamId(null);
      setEditingTeamName('');
    } catch (error: any) {
      showAlert('エラー', error.message || 'チーム名の更新に失敗しました');
    }
  };

  const handleCancelEditTeamName = () => {
    setEditingTeamId(null);
    setEditingTeamName('');
  };

  // メンバー移動
  const handleStartMoveMember = (memberId: string, memberName: string, currentTeamId: string) => {
    setMovingMember({ memberId, memberName, currentTeamId });
  };

  const handleMoveMember = async (newTeamId: string) => {
    if (!movingMember) return;

    try {
      await moveMemberToTeam(movingMember.memberId, newTeamId);
      setMovingMember(null);
    } catch (error: any) {
      showAlert('エラー', error.message || 'メンバーの移動に失敗しました');
    }
  };

  // メンバー追加
  const handleAddMemberToTeam = async (participantId: string) => {
    if (!addingToTeamId) return;

    try {
      await addMemberToTeam(addingToTeamId, participantId);
      setAddingToTeamId(null);
    } catch (error: any) {
      showAlert('エラー', error.message || 'メンバーの追加に失敗しました');
    }
  };

  // 未割り当てメンバーをチームに追加
  const handleAssignToTeam = async (teamId: string) => {
    if (!assigningParticipant) return;

    try {
      await addMemberToTeam(teamId, assigningParticipant.id);
      setAssigningParticipant(null);
    } catch (error: any) {
      showAlert('エラー', error.message || 'メンバーの追加に失敗しました');
    }
  };

  // Render empty state when no teams exist
  if (teams.length === 0) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* 主催者向けヒント：チーム分けセットアップ */}
        {isOrganizer && (
          <ContextHint
            tooltipId="organizer_team_setup"
            show={isOrganizer && teams.length === 0}
            delay={600}
          />
        )}

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

            <View style={styles.targetSelector}>
              <Text style={styles.teamCountLabel}>対象:</Text>
              <View style={styles.targetOptions}>
                <TouchableOpacity
                  style={[
                    styles.targetOption,
                    assignTarget === 'attending' && styles.targetOptionSelected,
                  ]}
                  onPress={() => setAssignTarget('attending')}
                >
                  <Text
                    style={[
                      styles.targetOptionText,
                      assignTarget === 'attending' && styles.targetOptionTextSelected,
                    ]}
                  >
                    参加予定 ({attendingParticipants.length})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.targetOption,
                    assignTarget === 'checked_in' && styles.targetOptionSelected,
                  ]}
                  onPress={() => setAssignTarget('checked_in')}
                >
                  <Text
                    style={[
                      styles.targetOptionText,
                      assignTarget === 'checked_in' && styles.targetOptionTextSelected,
                    ]}
                  >
                    来ている人 ({checkedInParticipants.length})
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 条件設定 */}
            {(hasSkillSettings || hasGenderSettings) && (
              <View style={styles.conditionSection}>
                <View style={styles.conditionHeader}>
                  <Settings2 size={16} color={colors.gray[600]} />
                  <Text style={styles.conditionTitle}>分け方の条件（任意）</Text>
                </View>

                {hasSkillSettings && (
                  <View style={styles.conditionRow}>
                    <Text style={styles.conditionLabel}>スキルレベルを均等にする</Text>
                    <Switch
                      value={balanceSkill}
                      onValueChange={setBalanceSkill}
                      trackColor={{ false: colors.gray[300], true: colors.primarySoft }}
                      thumbColor={balanceSkill ? colors.primary : colors.gray[100]}
                    />
                  </View>
                )}

                {hasGenderSettings && (
                  <View style={styles.conditionRow}>
                    <Text style={styles.conditionLabel}>男女比を均等にする</Text>
                    <Switch
                      value={balanceGender}
                      onValueChange={setBalanceGender}
                      trackColor={{ false: colors.gray[300], true: colors.primarySoft }}
                      thumbColor={balanceGender ? colors.primary : colors.gray[100]}
                    />
                  </View>
                )}
              </View>
            )}

            <Button
              title="チーム分けを実行"
              onPress={handleAutoAssign}
              icon={<Shuffle size={18} color={colors.white} />}
              style={styles.assignButtonFull}
              loading={teamLoading}
            />
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
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      {/* 主催者向けヒント：チーム編集 */}
      {isOrganizer && (
        <ContextHint
          tooltipId="organizer_team_edit"
          show={isOrganizer && teams.length > 0}
          delay={800}
        />
      )}

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

              <View style={styles.targetSelector}>
                <Text style={styles.teamCountLabel}>対象:</Text>
                <View style={styles.targetOptions}>
                  <TouchableOpacity
                    style={[
                      styles.targetOption,
                      assignTarget === 'attending' && styles.targetOptionSelected,
                    ]}
                    onPress={() => setAssignTarget('attending')}
                  >
                    <Text
                      style={[
                        styles.targetOptionText,
                        assignTarget === 'attending' && styles.targetOptionTextSelected,
                      ]}
                    >
                      参加予定 ({attendingParticipants.length})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.targetOption,
                      assignTarget === 'checked_in' && styles.targetOptionSelected,
                    ]}
                    onPress={() => setAssignTarget('checked_in')}
                  >
                    <Text
                      style={[
                        styles.targetOptionText,
                        assignTarget === 'checked_in' && styles.targetOptionTextSelected,
                      ]}
                    >
                      来ている人 ({checkedInParticipants.length})
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 条件設定 */}
              {(hasSkillSettings || hasGenderSettings) && (
                <View style={styles.conditionSectionCompact}>
                  {hasSkillSettings && (
                    <View style={styles.conditionRowCompact}>
                      <Text style={styles.conditionLabelCompact}>スキル均等</Text>
                      <Switch
                        value={balanceSkill}
                        onValueChange={setBalanceSkill}
                        trackColor={{ false: colors.gray[300], true: colors.primarySoft }}
                        thumbColor={balanceSkill ? colors.primary : colors.gray[100]}
                      />
                    </View>
                  )}
                  {hasGenderSettings && (
                    <View style={styles.conditionRowCompact}>
                      <Text style={styles.conditionLabelCompact}>男女均等</Text>
                      <Switch
                        value={balanceGender}
                        onValueChange={setBalanceGender}
                        trackColor={{ false: colors.gray[300], true: colors.primarySoft }}
                        thumbColor={balanceGender ? colors.primary : colors.gray[100]}
                      />
                    </View>
                  )}
                </View>
              )}

              <Button
                title="再分け"
                onPress={handleAutoAssign}
                icon={<Shuffle size={16} color={colors.white} />}
                style={styles.reassignButton}
                loading={teamLoading}
              />

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
        const isEditing = editingTeamId === team.id;

        return (
          <Card key={team.id} variant="elevated" style={styles.teamCard}>
            <View style={styles.teamHeader}>
              <TouchableOpacity
                style={styles.teamHeaderLeft}
                onPress={() => toggleTeamExpanded(team.id)}
              >
                <View style={[styles.teamColorIndicator, { backgroundColor: team.color }]} />
                {isEditing ? (
                  <View style={styles.editNameContainer}>
                    <TextInput
                      style={styles.editNameInput}
                      value={editingTeamName}
                      onChangeText={setEditingTeamName}
                      autoFocus
                      selectTextOnFocus
                    />
                    <TouchableOpacity style={styles.editNameButton} onPress={handleSaveTeamName}>
                      <Check size={18} color={colors.success} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.editNameButton} onPress={handleCancelEditTeamName}>
                      <X size={18} color={colors.gray[400]} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <Text style={styles.teamName}>{team.name}</Text>
                    <Badge
                      label={`${team.members.length}人`}
                      color="default"
                      size="sm"
                    />
                  </>
                )}
              </TouchableOpacity>
              <View style={styles.teamHeaderRight}>
                {isOrganizer && !isEditing && (
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => handleStartEditTeamName(team.id, team.name)}
                  >
                    <Edit3 size={16} color={colors.gray[400]} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => toggleTeamExpanded(team.id)}>
                  {isExpanded ? (
                    <ChevronUp size={20} color={colors.gray[400]} />
                  ) : (
                    <ChevronDown size={20} color={colors.gray[400]} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {isExpanded && (
              <View style={styles.teamMembers}>
                {team.members.length === 0 ? (
                  <Text style={styles.noMembersText}>メンバーがいません</Text>
                ) : (
                  team.members.map((member) => {
                    const participant = member.participant;
                    const memberUser = participant?.user;
                    const displayName = participant?.display_name || memberUser?.display_name || '名前未設定';

                    return (
                      <View key={member.id} style={styles.memberItem}>
                        <View style={styles.memberInfo}>
                          <Avatar
                            name={displayName}
                            imageUrl={memberUser?.avatar_url ?? undefined}
                            size="sm"
                          />
                          <Text style={styles.memberName}>{displayName}</Text>
                        </View>
                        {isOrganizer && (
                          <View style={styles.memberActions}>
                            <TouchableOpacity
                              style={styles.memberActionButton}
                              onPress={() => handleStartMoveMember(member.id, displayName, team.id)}
                            >
                              <ArrowRight size={16} color={colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.memberActionButton}
                              onPress={() => handleRemoveMember(member.id, displayName)}
                            >
                              <UserMinus size={16} color={colors.error} />
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    );
                  })
                )}
                {/* メンバー追加ボタン */}
                {isOrganizer && unassignedParticipants.length > 0 && (
                  <TouchableOpacity
                    style={styles.addMemberButton}
                    onPress={() => setAddingToTeamId(team.id)}
                  >
                    <UserPlus size={16} color={colors.primary} />
                    <Text style={styles.addMemberButtonText}>メンバーを追加</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </Card>
        );
      })}

      {/* メンバー移動モーダル */}
      <Modal
        visible={movingMember !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setMovingMember(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {movingMember?.memberName}を移動
              </Text>
              <TouchableOpacity onPress={() => setMovingMember(null)}>
                <X size={24} color={colors.gray[500]} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>移動先のチームを選択</Text>
            <View style={styles.teamSelectList}>
              {teams
                .filter((t) => t.id !== movingMember?.currentTeamId)
                .map((team) => (
                  <TouchableOpacity
                    key={team.id}
                    style={styles.teamSelectItem}
                    onPress={() => handleMoveMember(team.id)}
                  >
                    <View style={[styles.teamSelectColor, { backgroundColor: team.color }]} />
                    <Text style={styles.teamSelectName}>{team.name}</Text>
                    <Text style={styles.teamSelectCount}>{team.members.length}人</Text>
                  </TouchableOpacity>
                ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* メンバー追加モーダル */}
      <Modal
        visible={addingToTeamId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setAddingToTeamId(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>メンバーを追加</Text>
              <TouchableOpacity onPress={() => setAddingToTeamId(null)}>
                <X size={24} color={colors.gray[500]} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              {teams.find((t) => t.id === addingToTeamId)?.name}に追加するメンバーを選択
            </Text>
            <ScrollView style={styles.memberSelectList} showsVerticalScrollIndicator={false}>
              {unassignedParticipants.length === 0 ? (
                <Text style={styles.noUnassignedText}>未割り当てのメンバーがいません</Text>
              ) : (
                unassignedParticipants.map((participant) => {
                  const displayName = participant.display_name || participant.user?.display_name || '名前未設定';
                  return (
                    <TouchableOpacity
                      key={participant.id}
                      style={styles.memberSelectItem}
                      onPress={() => handleAddMemberToTeam(participant.id)}
                    >
                      <Avatar
                        name={displayName}
                        imageUrl={participant.user?.avatar_url ?? undefined}
                        size="sm"
                      />
                      <Text style={styles.memberSelectName}>{displayName}</Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 未割り当てメンバー */}
      {isOrganizer && unassignedParticipants.length > 0 && (
        <Card variant="elevated" style={styles.unassignedCard}>
          <Text style={styles.unassignedTitle}>未割り当て ({unassignedParticipants.length}人)</Text>
          <Text style={styles.unassignedHint}>タップしてチームに追加</Text>
          <View style={styles.unassignedList}>
            {unassignedParticipants.map((participant) => {
              const displayName = participant.display_name || participant.user?.display_name || '名前未設定';
              return (
                <TouchableOpacity
                  key={participant.id}
                  style={styles.unassignedItem}
                  onPress={() => setAssigningParticipant({ id: participant.id, name: displayName })}
                  activeOpacity={0.7}
                >
                  <Avatar
                    name={displayName}
                    imageUrl={participant.user?.avatar_url ?? undefined}
                    size="sm"
                  />
                  <Text style={styles.unassignedName}>{displayName}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>
      )}

      {/* 未割り当てメンバーのチーム選択モーダル */}
      <Modal
        visible={assigningParticipant !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setAssigningParticipant(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {assigningParticipant?.name}を追加
              </Text>
              <TouchableOpacity onPress={() => setAssigningParticipant(null)}>
                <X size={24} color={colors.gray[500]} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>追加先のチームを選択</Text>
            <View style={styles.teamSelectList}>
              {teams.map((team) => (
                <TouchableOpacity
                  key={team.id}
                  style={styles.teamSelectItem}
                  onPress={() => handleAssignToTeam(team.id)}
                >
                  <View style={[styles.teamSelectColor, { backgroundColor: team.color }]} />
                  <Text style={styles.teamSelectName}>{team.name}</Text>
                  <Text style={styles.teamSelectCount}>{team.members.length}人</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

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
  editButton: {
    padding: spacing.xs,
  },
  editNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.xs,
  },
  editNameInput: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.gray[900],
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.white,
  },
  editNameButton: {
    padding: spacing.xs,
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
    flex: 1,
  },
  memberName: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[700],
  },
  memberActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  memberActionButton: {
    padding: spacing.xs,
  },
  // モーダルスタイル
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 400,
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.gray[900],
  },
  modalSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    marginBottom: spacing.md,
  },
  teamSelectList: {
    gap: spacing.sm,
  },
  teamSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  teamSelectColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  teamSelectName: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: colors.gray[900],
  },
  teamSelectCount: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
  },
  // 対象選択スタイル
  targetSelector: {
    width: '100%',
    marginBottom: spacing.md,
  },
  targetOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  targetOption: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
  },
  targetOptionSelected: {
    backgroundColor: colors.primary,
  },
  targetOptionText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.gray[600],
  },
  targetOptionTextSelected: {
    color: colors.white,
  },
  // メンバー追加ボタン
  addMemberButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    borderStyle: 'dashed',
  },
  addMemberButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: '500',
  },
  // メンバー選択リスト
  memberSelectList: {
    maxHeight: 300,
  },
  memberSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  memberSelectName: {
    fontSize: typography.fontSize.base,
    color: colors.gray[900],
  },
  noUnassignedText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[400],
    textAlign: 'center',
    padding: spacing.md,
  },
  // 未割り当てカード
  unassignedCard: {
    padding: spacing.md,
    marginTop: spacing.md,
  },
  unassignedTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.gray[700],
    marginBottom: spacing.xs,
  },
  unassignedHint: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[400],
    marginBottom: spacing.sm,
  },
  unassignedList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  unassignedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.gray[100],
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
  },
  unassignedName: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[700],
  },
  // 条件設定
  conditionSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  conditionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  conditionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.gray[600],
  },
  conditionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  conditionLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[700],
  },
  conditionSectionCompact: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  conditionRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  conditionLabelCompact: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[600],
  },
  assignButtonFull: {
    marginTop: spacing.md,
  },
  reassignButton: {
    flex: 1,
  },
});
