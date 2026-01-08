import { create } from 'zustand';
import { supabase } from '../services/supabase';
import { Tournament, Match, GroupStanding, Team, TournamentFormat, TournamentSettings } from '../types';

interface MatchWithTeams extends Match {
  team1?: Team;
  team2?: Team;
}

interface StandingWithTeam extends GroupStanding {
  team?: Team;
}

interface MatchState {
  tournament: Tournament | null;
  tournaments: Tournament[]; // 複数の対戦表をサポート
  matches: MatchWithTeams[];
  standings: StandingWithTeam[];
  isLoading: boolean;
  error: string | null;

  // Tournament management
  createTournament: (
    eventId: string,
    format: TournamentFormat,
    concurrentMatches: number,
    settings: TournamentSettings
  ) => Promise<Tournament>;
  fetchTournament: (eventId: string) => Promise<void>;
  fetchAllTournaments: (eventId: string) => Promise<void>;
  selectTournament: (tournament: Tournament | null) => Promise<void>;
  deleteTournament: (tournamentId: string) => Promise<void>;

  // Team generation for individual competition
  generateIndividualTeams: (eventId: string, participantIds: string[]) => Promise<Team[]>;

  // Match generation
  generateRoundRobinMatches: (tournamentId: string, teamIds: string[], concurrentMatches: number) => Promise<void>;
  generateSingleEliminationMatches: (tournamentId: string, teamIds: string[], settings: TournamentSettings) => Promise<void>;
  generateDoubleEliminationMatches: (tournamentId: string, teamIds: string[], settings: TournamentSettings) => Promise<void>;
  generateSwissMatches: (tournamentId: string, teamIds: string[], rounds: number) => Promise<void>;

  // Match management
  fetchMatches: (tournamentId: string) => Promise<void>;
  updateMatchScore: (matchId: string, team1Score: number, team2Score: number) => Promise<void>;
  updateMatchCourt: (matchId: string, court: number | null) => Promise<void>;
  updateMatchTime: (matchId: string, scheduledTime: string | null) => Promise<void>;

  // Standings
  fetchStandings: (tournamentId: string) => Promise<void>;
  recalculateStandings: (tournamentId: string) => Promise<void>;

  // Clear
  clearMatches: () => void;
}

// ラウンドロビン(総当たり戦)のマッチング生成
const generateRoundRobinPairings = (teamIds: string[]): [string, string][][] => {
  const n = teamIds.length;
  if (n < 2) return [];

  // 偶数にする(奇数の場合はダミーを追加)
  const teams = [...teamIds];
  if (n % 2 === 1) {
    teams.push('BYE'); // 不戦勝
  }

  const rounds: [string, string][][] = [];
  const teamCount = teams.length;

  for (let round = 0; round < teamCount - 1; round++) {
    const roundMatches: [string, string][] = [];

    for (let i = 0; i < teamCount / 2; i++) {
      const home = teams[i];
      const away = teams[teamCount - 1 - i];

      if (home !== 'BYE' && away !== 'BYE') {
        roundMatches.push([home, away]);
      }
    }

    rounds.push(roundMatches);

    // ローテーション(最初のチーム以外を回転)
    const last = teams.pop()!;
    teams.splice(1, 0, last);
  }

  return rounds;
};

// トーナメント方式のマッチング生成（挿入用の部分的なマッチデータを生成）
type PartialMatchData = { round: number; team1_id: string; team2_id: string; match_number: number };
const generateTournamentBracket = (teamIds: string[], hasThirdPlaceMatch: boolean = false): PartialMatchData[][] => {
  const n = teamIds.length;
  // 2のべき乗に切り上げ
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(n)));
  const byeCount = bracketSize - n;

  // シードを配置
  const seeds = [...teamIds];
  // BYE追加
  for (let i = 0; i < byeCount; i++) {
    seeds.push('BYE');
  }

  const rounds: PartialMatchData[][] = [];
  let currentRound = seeds;
  let roundNumber = 1;

  while (currentRound.length > 1) {
    const nextRound: string[] = [];
    const roundMatches: PartialMatchData[] = [];

    for (let i = 0; i < currentRound.length; i += 2) {
      const team1 = currentRound[i];
      const team2 = currentRound[i + 1];

      if (team1 === 'BYE') {
        nextRound.push(team2);
      } else if (team2 === 'BYE') {
        nextRound.push(team1);
      } else {
        roundMatches.push({
          round: roundNumber,
          team1_id: team1,
          team2_id: team2,
          match_number: roundMatches.length + 1,
        });
        nextRound.push('WINNER'); // プレースホルダー
      }
    }

    if (roundMatches.length > 0) {
      rounds.push(roundMatches);
    }
    currentRound = nextRound;
    roundNumber++;
  }

  // 3位決定戦
  if (hasThirdPlaceMatch && rounds.length > 1) {
    const semiFinals = rounds[rounds.length - 2];
    if (semiFinals.length === 2) {
      const thirdPlaceMatch = {
        round: roundNumber,
        team1_id: 'LOSER_SF1',
        team2_id: 'LOSER_SF2',
        match_number: 1,
      };
      rounds.push([thirdPlaceMatch]);
    }
  }

  return rounds;
};

export const useMatchStore = create<MatchState>((set, get) => ({
  tournament: null,
  tournaments: [],
  matches: [],
  standings: [],
  isLoading: false,
  error: null,

  createTournament: async (eventId, format, concurrentMatches, settings) => {
    set({ isLoading: true, error: null });
    try {
      // Check if a tournament already exists for this event (due to unique constraint)
      const { data: existingTournament } = await supabase
        .from('tournaments')
        .select('id')
        .eq('event_id', eventId)
        .single();

      // If tournament exists, delete it first (with related matches and standings)
      if (existingTournament) {
        await supabase.from('matches').delete().eq('tournament_id', existingTournament.id);
        await supabase.from('group_standings').delete().eq('tournament_id', existingTournament.id);
        await supabase.from('tournaments').delete().eq('id', existingTournament.id);
      }

      const { data, error } = await supabase
        .from('tournaments')
        .insert({
          event_id: eventId,
          format,
          concurrent_matches: concurrentMatches,
          settings,
        })
        .select()
        .single();

      if (error) throw error;

      set({ tournament: data, tournaments: [data], isLoading: false });
      return data;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  fetchTournament: async (eventId) => {
    set({ isLoading: true, error: null });
    try {
      // 全ての対戦表を取得
      const { data: allTournaments, error: allError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (allError) throw allError;

      // 最新の対戦表を選択
      const latestTournament = allTournaments && allTournaments.length > 0 ? allTournaments[0] : null;

      set({ tournaments: allTournaments || [], tournament: latestTournament, isLoading: false });

      // トーナメントがある場合は試合と順位表も取得
      if (latestTournament) {
        await get().fetchMatches(latestTournament.id);
        if (latestTournament.settings?.enable_standings) {
          await get().fetchStandings(latestTournament.id);
        }
      } else {
        set({ matches: [], standings: [] });
      }
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  fetchAllTournaments: async (eventId) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      set({ tournaments: data || [], isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  selectTournament: async (tournament) => {
    set({ tournament, matches: [], standings: [] });

    if (tournament) {
      await get().fetchMatches(tournament.id);
      if (tournament.settings?.enable_standings) {
        await get().fetchStandings(tournament.id);
      }
    }
  },

  deleteTournament: async (tournamentId) => {
    set({ isLoading: true, error: null });
    try {
      // マッチを先に削除
      await supabase.from('matches').delete().eq('tournament_id', tournamentId);

      // 順位表を削除
      await supabase.from('group_standings').delete().eq('tournament_id', tournamentId);

      // トーナメントを削除
      const { error } = await supabase
        .from('tournaments')
        .delete()
        .eq('id', tournamentId);

      if (error) throw error;

      // 現在選択中のトーナメントが削除された場合
      const currentTournament = get().tournament;
      const updatedTournaments = get().tournaments.filter((t) => t.id !== tournamentId);

      if (currentTournament?.id === tournamentId) {
        // 別の対戦表があれば最新のものを選択
        const nextTournament = updatedTournaments.length > 0 ? updatedTournaments[0] : null;
        set({ tournament: nextTournament, tournaments: updatedTournaments, matches: [], standings: [], isLoading: false });

        if (nextTournament) {
          await get().fetchMatches(nextTournament.id);
          if (nextTournament.settings?.enable_standings) {
            await get().fetchStandings(nextTournament.id);
          }
        }
      } else {
        set({ tournaments: updatedTournaments, isLoading: false });
      }
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  generateIndividualTeams: async (eventId, participantIds) => {
    set({ isLoading: true, error: null });
    try {
      // 参加者情報を取得
      const { data: participants, error: fetchError } = await supabase
        .from('event_participants')
        .select('id, user_id, display_name, user:users(display_name)')
        .eq('event_id', eventId)
        .in('id', participantIds);

      if (fetchError) throw fetchError;

      // 各参加者を1人チームとして作成
      const teamColors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
        '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788',
        '#F06292', '#7986CB', '#4DD0E1', '#FFB74D', '#81C784',
      ];

      const teamsToInsert = participants?.map((participant, index) => {
        const userObj = participant.user as unknown as { display_name: string } | { display_name: string }[] | null;
        const userName = Array.isArray(userObj) ? userObj[0]?.display_name : userObj?.display_name;
        const displayName = participant.display_name || userName || '参加者';
        return {
          event_id: eventId,
          name: displayName,
          color: teamColors[index % teamColors.length],
          order: index,
        };
      }) || [];

      const { data: teams, error: insertError } = await supabase
        .from('teams')
        .insert(teamsToInsert)
        .select();

      if (insertError) throw insertError;

      // チームメンバーを追加
      const teamMembersToInsert = teams?.map((team, index) => ({
        team_id: team.id,
        participant_id: participants![index].id,
      })) || [];

      const { error: memberError } = await supabase
        .from('team_members')
        .insert(teamMembersToInsert);

      if (memberError) throw memberError;

      set({ isLoading: false });
      return teams || [];
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  generateRoundRobinMatches: async (tournamentId, teamIds, concurrentMatches) => {
    set({ isLoading: true, error: null });
    try {
      const rounds = generateRoundRobinPairings(teamIds);
      const matchesToInsert: any[] = [];

      let court = 1;
      rounds.forEach((roundMatches, roundIndex) => {
        roundMatches.forEach((pair, matchIndex) => {
          matchesToInsert.push({
            tournament_id: tournamentId,
            round: roundIndex + 1,
            match_number: matchIndex + 1,
            team1_id: pair[0],
            team2_id: pair[1],
            court: court <= concurrentMatches ? court : null,
            status: 'scheduled',
          });

          // コート番号を循環
          court = (court % concurrentMatches) + 1;
        });
      });

      if (matchesToInsert.length > 0) {
        const { error } = await supabase
          .from('matches')
          .insert(matchesToInsert);

        if (error) throw error;
      }

      await get().fetchMatches(tournamentId);
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  generateSingleEliminationMatches: async (tournamentId, teamIds, settings) => {
    set({ isLoading: true, error: null });
    try {
      const rounds = generateTournamentBracket(teamIds, settings.has_third_place_match);
      const matchesToInsert: any[] = [];

      rounds.forEach((roundMatches) => {
        roundMatches.forEach((match) => {
          matchesToInsert.push({
            tournament_id: tournamentId,
            round: match.round,
            match_number: match.match_number,
            team1_id: match.team1_id === 'WINNER' || match.team1_id === 'LOSER_SF1' || match.team1_id === 'LOSER_SF2' ? null : match.team1_id,
            team2_id: match.team2_id === 'WINNER' || match.team2_id === 'LOSER_SF1' || match.team2_id === 'LOSER_SF2' ? null : match.team2_id,
            status: 'scheduled',
          });
        });
      });

      if (matchesToInsert.length > 0) {
        const { error } = await supabase
          .from('matches')
          .insert(matchesToInsert);

        if (error) throw error;
      }

      await get().fetchMatches(tournamentId);
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  generateDoubleEliminationMatches: async (tournamentId, teamIds, settings) => {
    set({ isLoading: true, error: null });
    try {
      const matchesToInsert: any[] = [];

      // ウィナーズブラケットの生成
      const numTeams = teamIds.length;
      const bracketSize = Math.pow(2, Math.ceil(Math.log2(numTeams)));
      const numByes = bracketSize - numTeams;

      // シャッフル（ランダムシード）
      const shuffledTeams = [...teamIds].sort(() => Math.random() - 0.5);

      // 初回戦（ウィナーズブラケット）
      let matchNumber = 1;
      let round = 1;
      const winnersR1Matches: any[] = [];

      for (let i = 0; i < shuffledTeams.length; i += 2) {
        if (i + 1 < shuffledTeams.length) {
          winnersR1Matches.push({
            tournament_id: tournamentId,
            round,
            match_number: matchNumber++,
            team1_id: shuffledTeams[i],
            team2_id: shuffledTeams[i + 1],
            status: 'scheduled',
          });
        }
      }

      matchesToInsert.push(...winnersR1Matches);

      // ウィナーズブラケットの後続ラウンド（プレースホルダー）
      let winnersMatchCount = winnersR1Matches.length;
      round = 2;
      while (winnersMatchCount > 1) {
        winnersMatchCount = Math.ceil(winnersMatchCount / 2);
        for (let i = 0; i < winnersMatchCount; i++) {
          matchesToInsert.push({
            tournament_id: tournamentId,
            round,
            match_number: i + 1,
            team1_id: null,
            team2_id: null,
            status: 'scheduled',
          });
        }
        round++;
      }

      // ルーザーズブラケット（簡易版）
      // 実際の実装ではより複雑なロジックが必要
      const losersRounds = Math.ceil(Math.log2(numTeams)) * 2 - 1;
      for (let r = 1; r <= losersRounds; r++) {
        const losersMatches = Math.max(1, Math.floor(numTeams / Math.pow(2, r + 1)));
        for (let i = 0; i < losersMatches; i++) {
          matchesToInsert.push({
            tournament_id: tournamentId,
            round: round + r,
            match_number: i + 1,
            team1_id: null,
            team2_id: null,
            status: 'scheduled',
          });
        }
      }

      // グランドファイナル
      matchesToInsert.push({
        tournament_id: tournamentId,
        round: round + losersRounds + 1,
        match_number: 1,
        team1_id: null,
        team2_id: null,
        status: 'scheduled',
      });

      if (matchesToInsert.length > 0) {
        const { error } = await supabase
          .from('matches')
          .insert(matchesToInsert);

        if (error) throw error;
      }

      await get().fetchMatches(tournamentId);
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  generateSwissMatches: async (tournamentId, teamIds, rounds) => {
    set({ isLoading: true, error: null });
    try {
      // スイスドロー方式は第1ラウンドのみ生成
      // 後続ラウンドは前ラウンドの結果に基づいて動的に生成
      const matchesToInsert: any[] = [];

      // 初回ラウンド: ランダムペアリング
      const shuffledTeams = [...teamIds].sort(() => Math.random() - 0.5);

      for (let i = 0; i < shuffledTeams.length; i += 2) {
        if (i + 1 < shuffledTeams.length) {
          matchesToInsert.push({
            tournament_id: tournamentId,
            round: 1,
            match_number: Math.floor(i / 2) + 1,
            team1_id: shuffledTeams[i],
            team2_id: shuffledTeams[i + 1],
            status: 'scheduled',
          });
        }
      }

      if (matchesToInsert.length > 0) {
        const { error } = await supabase
          .from('matches')
          .insert(matchesToInsert);

        if (error) throw error;
      }

      await get().fetchMatches(tournamentId);
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  fetchMatches: async (tournamentId) => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          team1:teams!matches_team1_id_fkey(*),
          team2:teams!matches_team2_id_fkey(*)
        `)
        .eq('tournament_id', tournamentId)
        .order('round', { ascending: true })
        .order('match_number', { ascending: true });

      if (error) throw error;

      // Supabaseの結合結果が配列で返される場合があるため、正規化する
      const normalizedMatches = (data || []).map((match) => {
        const team1Raw = match.team1 as unknown;
        const team2Raw = match.team2 as unknown;
        return {
          ...match,
          team1: Array.isArray(team1Raw) ? team1Raw[0] : team1Raw,
          team2: Array.isArray(team2Raw) ? team2Raw[0] : team2Raw,
        };
      });

      set({ matches: normalizedMatches });
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  updateMatchScore: async (matchId, team1Score, team2Score) => {
    set({ isLoading: true, error: null });
    try {
      // 勝者を決定
      let winnerId: string | null = null;
      const match = get().matches.find((m) => m.id === matchId);

      if (match) {
        if (team1Score > team2Score) {
          winnerId = match.team1_id;
        } else if (team2Score > team1Score) {
          winnerId = match.team2_id;
        }
      }

      const { error } = await supabase
        .from('matches')
        .update({
          team1_score: team1Score,
          team2_score: team2Score,
          winner_id: winnerId,
          status: 'completed',
        })
        .eq('id', matchId);

      if (error) throw error;

      // マッチを再取得
      if (match) {
        await get().fetchMatches(match.tournament_id);

        // 順位表が有効な場合は再計算
        const tournament = get().tournament;
        if (tournament?.settings?.enable_standings) {
          await get().recalculateStandings(match.tournament_id);
        }
      }

      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateMatchCourt: async (matchId, court) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('matches')
        .update({ court })
        .eq('id', matchId);

      if (error) throw error;

      const match = get().matches.find((m) => m.id === matchId);
      if (match) {
        await get().fetchMatches(match.tournament_id);
      }

      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateMatchTime: async (matchId, scheduledTime) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('matches')
        .update({ scheduled_time: scheduledTime })
        .eq('id', matchId);

      if (error) throw error;

      const match = get().matches.find((m) => m.id === matchId);
      if (match) {
        await get().fetchMatches(match.tournament_id);
      }

      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  fetchStandings: async (tournamentId) => {
    try {
      const { data, error } = await supabase
        .from('group_standings')
        .select(`
          *,
          team:teams(*)
        `)
        .eq('tournament_id', tournamentId)
        .order('rank', { ascending: true });

      if (error) throw error;

      set({ standings: data || [] });
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  recalculateStandings: async (tournamentId) => {
    set({ isLoading: true, error: null });
    try {
      const tournament = get().tournament;
      if (!tournament) throw new Error('トーナメントが見つかりません');

      const matches = get().matches.filter((m) => m.status === 'completed');

      // チームごとの統計を計算
      const teamStats = new Map<string, any>();

      matches.forEach((match) => {
        if (!match.team1_id || !match.team2_id) return;

        // チーム1の統計を初期化
        if (!teamStats.has(match.team1_id)) {
          teamStats.set(match.team1_id, {
            team_id: match.team1_id,
            played: 0,
            won: 0,
            drawn: 0,
            lost: 0,
            goals_for: 0,
            goals_against: 0,
            points: 0,
          });
        }

        // チーム2の統計を初期化
        if (!teamStats.has(match.team2_id)) {
          teamStats.set(match.team2_id, {
            team_id: match.team2_id,
            played: 0,
            won: 0,
            drawn: 0,
            lost: 0,
            goals_for: 0,
            goals_against: 0,
            points: 0,
          });
        }

        const team1Stats = teamStats.get(match.team1_id)!;
        const team2Stats = teamStats.get(match.team2_id)!;

        const score1 = match.team1_score ?? 0;
        const score2 = match.team2_score ?? 0;

        team1Stats.played++;
        team2Stats.played++;

        team1Stats.goals_for += score1;
        team1Stats.goals_against += score2;
        team2Stats.goals_for += score2;
        team2Stats.goals_against += score1;

        const winPoints = tournament.settings?.win_points ?? 3;
        const drawPoints = tournament.settings?.draw_points ?? 1;

        if (score1 > score2) {
          team1Stats.won++;
          team2Stats.lost++;
          team1Stats.points += winPoints;
        } else if (score2 > score1) {
          team2Stats.won++;
          team1Stats.lost++;
          team2Stats.points += winPoints;
        } else {
          team1Stats.drawn++;
          team2Stats.drawn++;
          team1Stats.points += drawPoints;
          team2Stats.points += drawPoints;
        }
      });

      // 得失点差を計算
      const standings = Array.from(teamStats.values()).map((stats) => ({
        ...stats,
        goal_difference: stats.goals_for - stats.goals_against,
      }));

      // ソート: ポイント > 得失点差 > 得点
      standings.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference;
        return b.goals_for - a.goals_for;
      });

      // 順位を割り当て
      const standingsToUpsert = standings.map((stats, index) => ({
        tournament_id: tournamentId,
        team_id: stats.team_id,
        group_name: null,
        played: stats.played,
        won: stats.won,
        drawn: stats.drawn,
        lost: stats.lost,
        goals_for: stats.goals_for,
        goals_against: stats.goals_against,
        goal_difference: stats.goal_difference,
        points: stats.points,
        rank: index + 1,
      }));

      // 既存の順位表を削除
      await supabase
        .from('group_standings')
        .delete()
        .eq('tournament_id', tournamentId);

      // 新しい順位表を挿入
      if (standingsToUpsert.length > 0) {
        const { error } = await supabase
          .from('group_standings')
          .insert(standingsToUpsert);

        if (error) throw error;
      }

      await get().fetchStandings(tournamentId);
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  clearMatches: () => {
    set({ tournament: null, tournaments: [], matches: [], standings: [], error: null });
  },
}));
