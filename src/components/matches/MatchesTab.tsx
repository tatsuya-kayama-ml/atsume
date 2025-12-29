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
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Trophy,
  Users,
  Target,
  ChevronDown,
  ChevronUp,
  Play,
  Award,
  Calendar,
  MapPin,
  Edit2,
  Trash2,
  Plus,
} from 'lucide-react-native';
import { useMatchStore } from '../../stores/matchStore';
import { useTeamStore } from '../../stores/teamStore';
import { useEventStore } from '../../stores/eventStore';
import { useAuthStore } from '../../stores/authStore';
import { Card, Badge, Button } from '../common';
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme';
import { TournamentFormat, CompetitionType } from '../../types';

interface MatchesTabProps {
  eventId: string;
}

const COMPETITION_TYPE_OPTIONS: { value: CompetitionType; label: string; description: string }[] = [
  { value: 'team', label: '団体戦', description: 'チームで対戦' },
  { value: 'individual', label: '個人戦', description: '個人で対戦' },
];

const FORMAT_OPTIONS: { value: TournamentFormat; label: string; description: string }[] = [
  { value: 'round_robin', label: '総当たり戦', description: '全チームが対戦' },
  { value: 'single_elimination', label: 'シングルエリミネーション', description: '1回負けたら脱落' },
  { value: 'double_elimination', label: 'ダブルエリミネーション', description: '2回負けたら脱落' },
  { value: 'swiss', label: 'スイスドロー', description: '同じ戦績同士で対戦' },
];

export const MatchesTab: React.FC<MatchesTabProps> = ({ eventId }) => {
  const {
    tournament,
    matches,
    standings,
    isLoading,
    fetchTournament,
    createTournament,
    deleteTournament,
    generateRoundRobinMatches,
    generateSingleEliminationMatches,
    generateDoubleEliminationMatches,
    generateSwissMatches,
    generateIndividualTeams,
    updateMatchScore,
    updateMatchCourt,
  } = useMatchStore();

  const { teams, fetchTeams } = useTeamStore();
  const { currentEvent, participants } = useEventStore();
  const { user } = useAuthStore();

  const [showSettings, setShowSettings] = useState(false);
  const [competitionType, setCompetitionType] = useState<CompetitionType>('team');
  const [selectedFormat, setSelectedFormat] = useState<TournamentFormat>('round_robin');
  const [concurrentMatches, setConcurrentMatches] = useState(2);
  const [enableScoreTracking, setEnableScoreTracking] = useState(true);
  const [enableStandings, setEnableStandings] = useState(true);
  const [hasThirdPlaceMatch, setHasThirdPlaceMatch] = useState(false);
  const [swissRounds, setSwissRounds] = useState(3);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [editScores, setEditScores] = useState<{ team1: string; team2: string }>({ team1: '', team2: '' });
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);

  const isOrganizer = currentEvent?.organizer_id === user?.id;

  useFocusEffect(
    useCallback(() => {
      fetchTeams(eventId);
      fetchTournament(eventId);
    }, [eventId])
  );

  const handleCreateTournament = async () => {
    // 個人戦の場合は参加者チェック、団体戦の場合はチームチェック
    if (competitionType === 'individual') {
      if (selectedParticipants.length < 2) {
        const message = '参加者を2人以上選択してください';
        if (Platform.OS === 'web') {
          window.alert(message);
        } else {
          Alert.alert('エラー', message);
        }
        return;
      }
    } else {
      if (teams.length < 2) {
        const message = 'チームが2つ以上必要です';
        if (Platform.OS === 'web') {
          window.alert(message);
        } else {
          Alert.alert('エラー', message);
        }
        return;
      }
    }

    const confirmMessage = tournament
      ? '既存の対戦表をリセットして新しく作成しますか?'
      : '対戦表を作成しますか?';

    const proceed = async () => {
      try {
        // 既存のトーナメントを削除
        if (tournament) {
          await deleteTournament(tournament.id);
        }

        // 個人戦の場合は参加者を1人チームとして作成
        let teamIds: string[];
        if (competitionType === 'individual') {
          const individualTeams = await generateIndividualTeams(eventId, selectedParticipants);
          teamIds = individualTeams.map((t) => t.id);
          await fetchTeams(eventId); // チーム一覧を再取得
        } else {
          teamIds = teams.map((t) => t.id);
        }

        // 新しいトーナメントを作成
        const newTournament = await createTournament(eventId, selectedFormat, concurrentMatches, {
          competition_type: competitionType,
          enable_score_tracking: enableScoreTracking,
          enable_standings: enableStandings,
          has_third_place_match: selectedFormat === 'single_elimination' ? hasThirdPlaceMatch : false,
          swiss_rounds: selectedFormat === 'swiss' ? swissRounds : undefined,
          win_points: 3,
          draw_points: 1,
          loss_points: 0,
        });

        // マッチを生成
        if (selectedFormat === 'round_robin') {
          await generateRoundRobinMatches(newTournament.id, teamIds, concurrentMatches);
        } else if (selectedFormat === 'single_elimination') {
          await generateSingleEliminationMatches(newTournament.id, teamIds, {
            has_third_place_match: hasThirdPlaceMatch,
          });
        } else if (selectedFormat === 'double_elimination') {
          await generateDoubleEliminationMatches(newTournament.id, teamIds, {});
        } else if (selectedFormat === 'swiss') {
          await generateSwissMatches(newTournament.id, teamIds, swissRounds);
        }

        setShowSettings(false);

        const successMessage = '対戦表を作成しました';
        if (Platform.OS === 'web') {
          window.alert(successMessage);
        } else {
          Alert.alert('完了', successMessage);
        }
      } catch (error: any) {
        const errorMessage = error.message || '対戦表の作成に失敗しました';
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
      Alert.alert('対戦表作成', confirmMessage, [
        { text: 'キャンセル', style: 'cancel' },
        { text: '作成', onPress: proceed },
      ]);
    }
  };

  const handleDeleteTournament = () => {
    if (!tournament) return;

    const proceed = async () => {
      try {
        await deleteTournament(tournament.id);
        const successMessage = '対戦表を削除しました';
        if (Platform.OS === 'web') {
          window.alert(successMessage);
        } else {
          Alert.alert('完了', successMessage);
        }
      } catch (error: any) {
        const errorMessage = error.message || '削除に失敗しました';
        if (Platform.OS === 'web') {
          window.alert(errorMessage);
        } else {
          Alert.alert('エラー', errorMessage);
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('対戦表を削除しますか?')) {
        proceed();
      }
    } else {
      Alert.alert('対戦表削除', '対戦表を削除しますか?', [
        { text: 'キャンセル', style: 'cancel' },
        { text: '削除', style: 'destructive', onPress: proceed },
      ]);
    }
  };

  const handleUpdateScore = async (matchId: string) => {
    const team1Score = parseInt(editScores.team1, 10);
    const team2Score = parseInt(editScores.team2, 10);

    if (isNaN(team1Score) || isNaN(team2Score)) {
      const message = '有効なスコアを入力してください';
      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert('エラー', message);
      }
      return;
    }

    try {
      await updateMatchScore(matchId, team1Score, team2Score);
      setEditingMatchId(null);
      setEditScores({ team1: '', team2: '' });
    } catch (error: any) {
      const errorMessage = error.message || 'スコアの更新に失敗しました';
      if (Platform.OS === 'web') {
        window.alert(errorMessage);
      } else {
        Alert.alert('エラー', errorMessage);
      }
    }
  };

  const startEditScore = (matchId: string, team1Score: number | null, team2Score: number | null) => {
    setEditingMatchId(matchId);
    setEditScores({
      team1: team1Score?.toString() || '',
      team2: team2Score?.toString() || '',
    });
  };

  // 対戦表が存在しない場合
  if (!tournament) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => fetchTournament(eventId)}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {isOrganizer ? (
          <Card variant="elevated" style={styles.emptyCard}>
            <View style={styles.emptyIconContainer}>
              <Trophy size={48} color={colors.gray[300]} />
            </View>
            <Text style={styles.emptyTitle}>対戦表がありません</Text>
            <Text style={styles.emptyMessage}>
              チームを作成してから対戦表を生成しましょう
            </Text>

            {/* 競技タイプ選択 */}
            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>競技タイプ</Text>
              <View style={styles.formatOptions}>
                {COMPETITION_TYPE_OPTIONS.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.formatOption,
                      competitionType === type.value && styles.formatOptionActive,
                    ]}
                    onPress={() => setCompetitionType(type.value)}
                  >
                    <Text
                      style={[
                        styles.formatOptionTitle,
                        competitionType === type.value && styles.formatOptionTitleActive,
                      ]}
                    >
                      {type.label}
                    </Text>
                    <Text style={styles.formatOptionDescription}>{type.description}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 個人戦の場合: 参加者選択 */}
            {competitionType === 'individual' && (
              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>参加者選択</Text>
                <Text style={styles.settingsDescription}>
                  対戦に参加させる参加者を選択してください
                </Text>
                {participants
                  .filter((p) => p.attendance_status === 'attending' || p.actual_attendance === true)
                  .map((participant) => {
                    const isSelected = selectedParticipants.includes(participant.id);
                    const displayName =
                      participant.display_name || participant.user?.display_name || '参加者';
                    return (
                      <TouchableOpacity
                        key={participant.id}
                        style={styles.checkboxRow}
                        onPress={() => {
                          if (isSelected) {
                            setSelectedParticipants(selectedParticipants.filter((id) => id !== participant.id));
                          } else {
                            setSelectedParticipants([...selectedParticipants, participant.id]);
                          }
                        }}
                      >
                        <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                          {isSelected && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                        <Text style={styles.checkboxLabel}>{displayName}</Text>
                      </TouchableOpacity>
                    );
                  })}
              </View>
            )}

            {/* 団体戦の場合: チーム数チェック */}
            {competitionType === 'team' && teams.length < 2 ? (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  ⚠️ チームが{teams.length}個です。2個以上のチームが必要です。
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.settingsSection}>
                  <Text style={styles.settingsSectionTitle}>対戦形式</Text>
                  <View style={styles.formatOptions}>
                    {FORMAT_OPTIONS.map((format) => (
                      <TouchableOpacity
                        key={format.value}
                        style={[
                          styles.formatOption,
                          selectedFormat === format.value && styles.formatOptionActive,
                        ]}
                        onPress={() => setSelectedFormat(format.value)}
                      >
                        <Text
                          style={[
                            styles.formatOptionTitle,
                            selectedFormat === format.value && styles.formatOptionTitleActive,
                          ]}
                        >
                          {format.label}
                        </Text>
                        <Text style={styles.formatOptionDescription}>{format.description}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.settingsSection}>
                  <Text style={styles.settingsSectionTitle}>同時進行試合数 (コート数)</Text>
                  <View style={styles.numberInputRow}>
                    <TouchableOpacity
                      style={styles.numberButton}
                      onPress={() => setConcurrentMatches(Math.max(1, concurrentMatches - 1))}
                    >
                      <Text style={styles.numberButtonText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.numberValue}>{concurrentMatches}</Text>
                    <TouchableOpacity
                      style={styles.numberButton}
                      onPress={() => setConcurrentMatches(Math.min(10, concurrentMatches + 1))}
                    >
                      <Text style={styles.numberButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {selectedFormat === 'single_elimination' && (
                  <View style={styles.settingsSection}>
                    <TouchableOpacity
                      style={styles.checkboxRow}
                      onPress={() => setHasThirdPlaceMatch(!hasThirdPlaceMatch)}
                    >
                      <View style={[styles.checkbox, hasThirdPlaceMatch && styles.checkboxChecked]}>
                        {hasThirdPlaceMatch && <Text style={styles.checkmark}>✓</Text>}
                      </View>
                      <Text style={styles.checkboxLabel}>3位決定戦を含む</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {selectedFormat === 'swiss' && (
                  <View style={styles.settingsSection}>
                    <Text style={styles.settingsSectionTitle}>ラウンド数</Text>
                    <View style={styles.numberInputRow}>
                      <TouchableOpacity
                        style={styles.numberButton}
                        onPress={() => setSwissRounds(Math.max(1, swissRounds - 1))}
                      >
                        <Text style={styles.numberButtonText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.numberValue}>{swissRounds}</Text>
                      <TouchableOpacity
                        style={styles.numberButton}
                        onPress={() => setSwissRounds(Math.min(10, swissRounds + 1))}
                      >
                        <Text style={styles.numberButtonText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <View style={styles.settingsSection}>
                  <TouchableOpacity
                    style={styles.checkboxRow}
                    onPress={() => setEnableScoreTracking(!enableScoreTracking)}
                  >
                    <View style={[styles.checkbox, enableScoreTracking && styles.checkboxChecked]}>
                      {enableScoreTracking && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={styles.checkboxLabel}>試合結果を記録する</Text>
                  </TouchableOpacity>

                  {selectedFormat === 'round_robin' && (
                    <TouchableOpacity
                      style={styles.checkboxRow}
                      onPress={() => setEnableStandings(!enableStandings)}
                    >
                      <View style={[styles.checkbox, enableStandings && styles.checkboxChecked]}>
                        {enableStandings && <Text style={styles.checkmark}>✓</Text>}
                      </View>
                      <Text style={styles.checkboxLabel}>順位表を表示する</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <Button
                  title="対戦表を作成"
                  onPress={handleCreateTournament}
                  icon={<Play size={18} color={colors.white} />}
                  loading={isLoading}
                  fullWidth
                />

                <Text style={styles.teamCountInfo}>参加チーム: {teams.length}個</Text>
              </>
            )}
          </Card>
        ) : (
          <Card variant="elevated" style={styles.emptyCard}>
            <View style={styles.emptyIconContainer}>
              <Trophy size={48} color={colors.gray[300]} />
            </View>
            <Text style={styles.emptyTitle}>対戦表がありません</Text>
            <Text style={styles.emptyMessage}>
              主催者が対戦表を作成するまでお待ちください
            </Text>
          </Card>
        )}
      </ScrollView>
    );
  }

  // 対戦表が存在する場合
  // ダブルエリミネーション用にブラケットタイプでグループ化
  const groupedByBracket = matches.reduce((acc, match) => {
    const bracketType = match.bracket_type || 'winners';
    if (!acc[bracketType]) {
      acc[bracketType] = [];
    }
    acc[bracketType].push(match);
    return acc;
  }, {} as Record<string, typeof matches>);

  // 各ブラケット内でラウンド別にグループ化
  const groupedMatches = Object.keys(groupedByBracket).reduce((acc, bracketType) => {
    acc[bracketType] = groupedByBracket[bracketType].reduce((roundAcc, match) => {
      const round = match.round;
      if (!roundAcc[round]) {
        roundAcc[round] = [];
      }
      roundAcc[round].push(match);
      return roundAcc;
    }, {} as Record<number, typeof matches>);
    return acc;
  }, {} as Record<string, Record<number, typeof matches>>);

  const formatLabel = FORMAT_OPTIONS.find((f) => f.value === tournament.format)?.label || tournament.format;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={() => fetchTournament(eventId)}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      {/* Tournament Header */}
      <Card variant="elevated" style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Trophy size={20} color={colors.primary} />
            <Text style={styles.headerTitle}>{formatLabel}</Text>
          </View>
          {isOrganizer && (
            <TouchableOpacity onPress={handleDeleteTournament} style={styles.deleteButton}>
              <Trash2 size={18} color={colors.error} />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.headerInfo}>
          <View style={styles.headerInfoItem}>
            <Users size={14} color={colors.gray[500]} />
            <Text style={styles.headerInfoText}>{teams.length}チーム</Text>
          </View>
          <View style={styles.headerInfoItem}>
            <Target size={14} color={colors.gray[500]} />
            <Text style={styles.headerInfoText}>{matches.length}試合</Text>
          </View>
          {tournament.concurrent_matches > 0 && (
            <View style={styles.headerInfoItem}>
              <MapPin size={14} color={colors.gray[500]} />
              <Text style={styles.headerInfoText}>{tournament.concurrent_matches}コート</Text>
            </View>
          )}
        </View>
      </Card>

      {/* Standings (if enabled) */}
      {tournament.settings?.enable_standings && standings.length > 0 && (
        <Card variant="elevated" style={styles.standingsCard}>
          <View style={styles.cardHeader}>
            <Award size={18} color={colors.primary} style={{ marginRight: spacing.sm }} />
            <Text style={styles.cardTitle}>順位表</Text>
          </View>
          <View style={styles.standingsTable}>
            <View style={styles.standingsHeaderRow}>
              <Text style={[styles.standingsHeaderCell, styles.rankCell]}>#</Text>
              <Text style={[styles.standingsHeaderCell, styles.teamCell]}>チーム</Text>
              <Text style={[styles.standingsHeaderCell, styles.statCell]}>試</Text>
              <Text style={[styles.standingsHeaderCell, styles.statCell]}>勝</Text>
              <Text style={[styles.standingsHeaderCell, styles.statCell]}>分</Text>
              <Text style={[styles.standingsHeaderCell, styles.statCell]}>敗</Text>
              <Text style={[styles.standingsHeaderCell, styles.statCell]}>得</Text>
              <Text style={[styles.standingsHeaderCell, styles.statCell]}>失</Text>
              <Text style={[styles.standingsHeaderCell, styles.pointsCell]}>勝点</Text>
            </View>
            {standings.map((standing) => (
              <View key={standing.id} style={styles.standingsRow}>
                <Text style={[styles.standingsCell, styles.rankCell, styles.rankText]}>
                  {standing.rank}
                </Text>
                <View style={[styles.standingsCell, styles.teamCell, styles.teamNameCell]}>
                  <View
                    style={[styles.teamColorDot, { backgroundColor: standing.team?.color || colors.gray[300] }]}
                  />
                  <Text style={styles.teamNameText} numberOfLines={1}>
                    {standing.team?.name}
                  </Text>
                </View>
                <Text style={[styles.standingsCell, styles.statCell]}>{standing.played}</Text>
                <Text style={[styles.standingsCell, styles.statCell]}>{standing.won}</Text>
                <Text style={[styles.standingsCell, styles.statCell]}>{standing.drawn}</Text>
                <Text style={[styles.standingsCell, styles.statCell]}>{standing.lost}</Text>
                <Text style={[styles.standingsCell, styles.statCell]}>{standing.goals_for}</Text>
                <Text style={[styles.standingsCell, styles.statCell]}>{standing.goals_against}</Text>
                <Text style={[styles.standingsCell, styles.pointsCell, styles.pointsText]}>
                  {standing.points}
                </Text>
              </View>
            ))}
          </View>
        </Card>
      )}

      {/* Matches */}
      {Object.keys(groupedMatches).map((bracketType) => {
        const bracketLabel =
          bracketType === 'winners'
            ? 'ウィナーズブラケット'
            : bracketType === 'losers'
            ? 'ルーザーズブラケット'
            : bracketType === 'finals'
            ? 'グランドファイナル'
            : '';

        return (
          <View key={bracketType}>
            {tournament.format === 'double_elimination' && bracketLabel && (
              <Text style={styles.bracketTitle}>{bracketLabel}</Text>
            )}
            {Object.keys(groupedMatches[bracketType])
              .sort((a, b) => Number(a) - Number(b))
              .map((roundKey) => {
                const round = Number(roundKey);
                const roundMatches = groupedMatches[bracketType][round];

                return (
                  <Card key={`${bracketType}-${round}`} variant="elevated" style={styles.roundCard}>
                    <View style={styles.roundHeader}>
                      <Text style={styles.roundTitle}>
                        {tournament.format === 'single_elimination'
                          ? round === 1
                            ? '1回戦'
                            : round === 2
                            ? '準決勝'
                            : round === 3
                            ? '決勝'
                            : `第${round}ラウンド`
                          : `第${round}節`}
                      </Text>
                      <Badge label={`${roundMatches.length}試合`} color="default" size="sm" />
                    </View>

              {roundMatches.map((match) => (
                <View key={match.id} style={styles.matchCard}>
                  <View style={styles.matchHeader}>
                    <View style={styles.matchNumber}>
                      <Text style={styles.matchNumberText}>試合{match.match_number}</Text>
                    </View>
                    {match.court && (
                      <View style={styles.courtBadge}>
                        <MapPin size={12} color={colors.gray[600]} />
                        <Text style={styles.courtText}>コート{match.court}</Text>
                      </View>
                    )}
                    {match.status === 'completed' && (
                      <Badge label="終了" color="success" size="sm" variant="soft" />
                    )}
                  </View>

                  <View style={styles.matchContent}>
                    {/* Team 1 */}
                    <View style={styles.teamRow}>
                      <View style={styles.teamInfo}>
                        <View
                          style={[
                            styles.teamColorIndicator,
                            { backgroundColor: match.team1?.color || colors.gray[300] },
                          ]}
                        />
                        <Text style={styles.teamName}>{match.team1?.name || 'TBD'}</Text>
                      </View>
                      {editingMatchId === match.id && isOrganizer && tournament.settings?.enable_score_tracking ? (
                        <TextInput
                          style={styles.scoreInput}
                          value={editScores.team1}
                          onChangeText={(text) => setEditScores({ ...editScores, team1: text })}
                          keyboardType="numeric"
                          placeholder="0"
                        />
                      ) : (
                        <Text style={styles.score}>
                          {match.team1_score !== null ? match.team1_score : '-'}
                        </Text>
                      )}
                    </View>

                    <View style={styles.vsDivider}>
                      <Text style={styles.vsText}>vs</Text>
                    </View>

                    {/* Team 2 */}
                    <View style={styles.teamRow}>
                      <View style={styles.teamInfo}>
                        <View
                          style={[
                            styles.teamColorIndicator,
                            { backgroundColor: match.team2?.color || colors.gray[300] },
                          ]}
                        />
                        <Text style={styles.teamName}>{match.team2?.name || 'TBD'}</Text>
                      </View>
                      {editingMatchId === match.id && isOrganizer && tournament.settings?.enable_score_tracking ? (
                        <TextInput
                          style={styles.scoreInput}
                          value={editScores.team2}
                          onChangeText={(text) => setEditScores({ ...editScores, team2: text })}
                          keyboardType="numeric"
                          placeholder="0"
                        />
                      ) : (
                        <Text style={styles.score}>
                          {match.team2_score !== null ? match.team2_score : '-'}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Score Edit Buttons (Organizer Only) */}
                  {isOrganizer && tournament.settings?.enable_score_tracking && (
                    <View style={styles.matchActions}>
                      {editingMatchId === match.id ? (
                        <>
                          <TouchableOpacity
                            style={[styles.actionButton, styles.cancelButton]}
                            onPress={() => {
                              setEditingMatchId(null);
                              setEditScores({ team1: '', team2: '' });
                            }}
                          >
                            <Text style={styles.cancelButtonText}>キャンセル</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionButton, styles.saveButton]}
                            onPress={() => handleUpdateScore(match.id)}
                          >
                            <Text style={styles.saveButtonText}>保存</Text>
                          </TouchableOpacity>
                        </>
                      ) : (
                        <TouchableOpacity
                          style={styles.editButton}
                          onPress={() => startEditScore(match.id, match.team1_score, match.team2_score)}
                        >
                          <Edit2 size={14} color={colors.primary} />
                          <Text style={styles.editButtonText}>
                            {match.status === 'completed' ? 'スコア編集' : 'スコア入力'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              ))}
            </Card>
          );
        })}
          </View>
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
  warningBox: {
    backgroundColor: colors.warningSoft,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    width: '100%',
  },
  warningText: {
    fontSize: typography.fontSize.sm,
    color: colors.warning,
    textAlign: 'center',
  },
  settingsSection: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  settingsSectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.gray[700],
    marginBottom: spacing.sm,
  },
  settingsDescription: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[500],
    marginBottom: spacing.md,
  },
  formatOptions: {
    gap: spacing.sm,
  },
  formatOption: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.gray[200],
    backgroundColor: colors.white,
  },
  formatOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  formatOptionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.gray[700],
    marginBottom: 2,
  },
  formatOptionTitleActive: {
    color: colors.primary,
  },
  formatOptionDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
  },
  numberInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  numberButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  numberButtonText: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.white,
  },
  numberValue: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: colors.gray[900],
    minWidth: 60,
    textAlign: 'center',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.gray[300],
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
  },
  checkboxLabel: {
    fontSize: typography.fontSize.base,
    color: colors.gray[700],
  },
  teamCountInfo: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    textAlign: 'center',
    marginTop: spacing.md,
  },
  headerCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.gray[900],
  },
  deleteButton: {
    padding: spacing.xs,
  },
  headerInfo: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  headerInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerInfoText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
  },
  standingsCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  cardTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.gray[900],
  },
  standingsTable: {
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  standingsHeaderRow: {
    flexDirection: 'row',
    backgroundColor: colors.gray[50],
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  standingsHeaderCell: {
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    color: colors.gray[600],
    textAlign: 'center',
  },
  standingsRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  standingsCell: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[700],
    textAlign: 'center',
  },
  rankCell: {
    width: 30,
  },
  teamCell: {
    flex: 1,
    textAlign: 'left',
  },
  statCell: {
    width: 32,
  },
  pointsCell: {
    width: 40,
  },
  rankText: {
    fontWeight: '700',
    color: colors.primary,
  },
  teamNameCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  teamColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  teamNameText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.gray[900],
    flex: 1,
  },
  pointsText: {
    fontWeight: '700',
    color: colors.primary,
  },
  roundCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  roundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  roundTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.gray[900],
  },
  bracketTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  matchCard: {
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  matchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  matchNumber: {
    flex: 1,
  },
  matchNumberText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.gray[700],
  },
  courtBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
  },
  courtText: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[600],
  },
  matchContent: {
    gap: spacing.sm,
  },
  teamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  teamColorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  teamName: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: colors.gray[900],
  },
  score: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.gray[900],
    minWidth: 40,
    textAlign: 'right',
  },
  scoreInput: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.gray[900],
    minWidth: 60,
    textAlign: 'right',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.white,
  },
  vsDivider: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  vsText: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[400],
    fontWeight: '600',
  },
  matchActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.gray[100],
  },
  cancelButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.gray[600],
  },
  saveButton: {
    backgroundColor: colors.primary,
    ...shadows.sm,
  },
  saveButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.white,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  editButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
});
