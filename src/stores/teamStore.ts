import { create } from 'zustand';
import { supabase } from '../services/supabase';
import { Team, TeamMember, EventParticipant } from '../types';

interface TeamWithMembers extends Team {
  members: (TeamMember & { participant: EventParticipant })[];
}

interface TeamState {
  teams: TeamWithMembers[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchTeams: (eventId: string) => Promise<void>;
  createTeams: (eventId: string, teamCount: number, teamNames?: string[]) => Promise<Team[]>;
  updateTeam: (teamId: string, data: Partial<Team>) => Promise<void>;
  deleteTeam: (teamId: string) => Promise<void>;
  deleteAllTeams: (eventId: string) => Promise<void>;

  // Team member management
  addMemberToTeam: (teamId: string, participantId: string) => Promise<void>;
  removeMemberFromTeam: (memberId: string) => Promise<void>;
  moveMemberToTeam: (memberId: string, newTeamId: string) => Promise<void>;

  // Auto assignment
  autoAssignTeams: (eventId: string, mode: 'random' | 'balanced', teamCount: number, target?: 'attending' | 'checked_in') => Promise<void>;

  // Clear
  clearTeams: () => void;
}

// Team color palette
const TEAM_COLORS = [
  '#EF4444', // Red
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#84CC16', // Lime
  '#6366F1', // Indigo
];

// Team name generator
const generateTeamName = (index: number): string => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return `チーム${letters[index] || index + 1}`;
};

// Shuffle array (Fisher-Yates)
const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Balanced assignment using snake draft
const balancedAssignment = (
  participants: EventParticipant[],
  teamCount: number
): Map<number, EventParticipant[]> => {
  // Sort by skill level descending
  const sorted = [...participants].sort((a, b) => {
    const skillA = a.skill_level ?? 3;
    const skillB = b.skill_level ?? 3;
    return skillB - skillA;
  });

  const teams = new Map<number, EventParticipant[]>();
  for (let i = 0; i < teamCount; i++) {
    teams.set(i, []);
  }

  // Snake draft: 0,1,2,3,3,2,1,0,0,1,2,3...
  let direction = 1;
  let currentTeam = 0;

  sorted.forEach((participant) => {
    teams.get(currentTeam)!.push(participant);

    currentTeam += direction;
    if (currentTeam >= teamCount) {
      currentTeam = teamCount - 1;
      direction = -1;
    } else if (currentTeam < 0) {
      currentTeam = 0;
      direction = 1;
    }
  });

  return teams;
};

export const useTeamStore = create<TeamState>((set, get) => ({
  teams: [],
  isLoading: false,
  error: null,

  fetchTeams: async (eventId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select(`
          *,
          members:team_members(
            *,
            participant:event_participants(
              *,
              user:users(id, display_name, avatar_url, skill_level)
            )
          )
        `)
        .eq('event_id', eventId)
        .order('order', { ascending: true });

      if (teamsError) throw teamsError;

      set({ teams: teams || [], isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  createTeams: async (eventId: string, teamCount: number, teamNames?: string[]) => {
    set({ isLoading: true, error: null });
    try {
      const teamsToCreate = [];
      for (let i = 0; i < teamCount; i++) {
        teamsToCreate.push({
          event_id: eventId,
          name: teamNames?.[i] || generateTeamName(i),
          color: TEAM_COLORS[i % TEAM_COLORS.length],
          order: i,
        });
      }

      const { data, error } = await supabase
        .from('teams')
        .insert(teamsToCreate)
        .select();

      if (error) throw error;

      await get().fetchTeams(eventId);
      set({ isLoading: false });
      return data;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateTeam: async (teamId: string, data: Partial<Team>) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('teams')
        .update(data)
        .eq('id', teamId);

      if (error) throw error;

      set((state) => ({
        teams: state.teams.map((team) =>
          team.id === teamId ? { ...team, ...data } : team
        ) as TeamWithMembers[],
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  deleteTeam: async (teamId: string) => {
    set({ isLoading: true, error: null });
    try {
      // Delete team members first
      await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId);

      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);

      if (error) throw error;

      set((state) => ({
        teams: state.teams.filter((team) => team.id !== teamId),
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  deleteAllTeams: async (eventId: string) => {
    set({ isLoading: true, error: null });
    try {
      // Get all team IDs for this event
      const { data: teams } = await supabase
        .from('teams')
        .select('id')
        .eq('event_id', eventId);

      if (teams && teams.length > 0) {
        const teamIds = teams.map((t) => t.id);

        // Delete all team members
        await supabase
          .from('team_members')
          .delete()
          .in('team_id', teamIds);

        // Delete all teams
        await supabase
          .from('teams')
          .delete()
          .eq('event_id', eventId);
      }

      set({ teams: [], isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  addMemberToTeam: async (teamId: string, participantId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('team_members')
        .insert({
          team_id: teamId,
          participant_id: participantId,
        });

      if (error) throw error;

      // Refetch teams to update state
      const team = get().teams.find((t) => t.id === teamId);
      if (team) {
        await get().fetchTeams(team.event_id);
      }
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  removeMemberFromTeam: async (memberId: string) => {
    set({ isLoading: true, error: null });
    try {
      // Find the team that contains this member
      let eventId: string | null = null;
      for (const team of get().teams) {
        const member = team.members.find((m) => m.id === memberId);
        if (member) {
          eventId = team.event_id;
          break;
        }
      }

      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      if (eventId) {
        await get().fetchTeams(eventId);
      }
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  moveMemberToTeam: async (memberId: string, newTeamId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ team_id: newTeamId })
        .eq('id', memberId);

      if (error) throw error;

      // Refetch teams
      const team = get().teams.find((t) => t.id === newTeamId);
      if (team) {
        await get().fetchTeams(team.event_id);
      }
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  autoAssignTeams: async (eventId: string, mode: 'random' | 'balanced', teamCount: number, target: 'attending' | 'checked_in' = 'attending') => {
    set({ isLoading: true, error: null });
    try {
      // First, delete existing teams
      await get().deleteAllTeams(eventId);

      // Build query based on target
      let query = supabase
        .from('event_participants')
        .select(`
          *,
          user:users(id, display_name, avatar_url, skill_level)
        `)
        .eq('event_id', eventId);

      if (target === 'checked_in') {
        query = query.eq('check_in_status', 'checked_in');
      } else {
        query = query.eq('attendance_status', 'attending');
      }

      const { data: participants, error: participantsError } = await query;

      if (participantsError) throw participantsError;
      if (!participants || participants.length === 0) {
        throw new Error(target === 'checked_in' ? '来ている参加者がいません' : '参加予定者がいません');
      }

      // Create teams
      const teams = await get().createTeams(eventId, teamCount);

      // Assign participants to teams
      let assignments: Map<number, EventParticipant[]>;

      if (mode === 'random') {
        const shuffled = shuffleArray(participants);
        assignments = new Map();
        for (let i = 0; i < teamCount; i++) {
          assignments.set(i, []);
        }
        shuffled.forEach((participant, index) => {
          assignments.get(index % teamCount)!.push(participant);
        });
      } else {
        // Balanced mode
        assignments = balancedAssignment(participants, teamCount);
      }

      // Insert team members
      const membersToInsert: { team_id: string; participant_id: string }[] = [];
      assignments.forEach((members, teamIndex) => {
        members.forEach((participant) => {
          membersToInsert.push({
            team_id: teams[teamIndex].id,
            participant_id: participant.id,
          });
        });
      });

      if (membersToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('team_members')
          .insert(membersToInsert);

        if (insertError) throw insertError;
      }

      // Refetch teams with members
      await get().fetchTeams(eventId);
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  clearTeams: () => {
    set({ teams: [], error: null });
  },
}));
