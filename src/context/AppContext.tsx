import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { Team, Member, Standup, Leave, Task } from '../types';
import { useAuth } from './AuthContext';

interface AppContextType {
  teams: Team[];
  members: Member[];
  standups: Standup[];
  leaves: Leave[];
  loading: boolean;
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  createStandup: (content: string[]) => Promise<{ success: boolean; error?: string }>;
  createLeaveRequest: (leaveData: Omit<Leave, 'id' | 'member_id' | 'team_id' | 'approved'>) => Promise<{ success: boolean; error?: string }>;
  approveLeave: (leaveId: number) => Promise<{ success: boolean; error?: string }>;
  rejectLeave: (leaveId: number) => Promise<{ success: boolean; error?: string }>;
  cancelLeave: (leaveId: number) => Promise<{ success: boolean; error?: string }>;
  assignMentor: (mentorId: number) => Promise<{ success: boolean; error?: string }>;
  refreshData: () => Promise<void>;
  getTeamById: (id: number) => Team | undefined;
  getMembersByTeamId: (teamId: number) => Member[];
  getStandupsByTeamAndDate: (teamId: number, date: Date) => Standup[];
  getStandupsByMemberId: (memberId: number) => Standup[];
  getTodaysStandupByMember: (memberId: number) => Standup | undefined;
  getPendingLeavesByTeam: (teamId: number) => Leave[];
  currentUser: any;
  toggleTaskCompletion: (standupId: number, taskId: string) => void;
  addStandup: (standup: any) => void;
  updateStandup: (standupId: number, updates: any) => void;
  getMemberById: (memberId: string) => Member | undefined;
  isUserOnLeave: (memberId: number, date?: Date) => boolean;
  shouldSkipStandup: (memberId: number, date?: Date) => boolean;
  getUserLeaveStatus: (memberId: number, date?: Date) => { onLeave: boolean; leaveType?: string; reason?: string };
  getMentorById: (mentorId: number) => Member | undefined;
  getMentors: () => Member[];
  fetchMentors: () => Promise<Member[]>;
  refreshCurrentUser: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

// Helper function to get local date string (YYYY-MM-DD) without timezone conversion
const getLocalDateString = (date: Date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper function to transform standup data for compatibility with StandupCard
const transformStandupData = (standup: any): Standup => {
  // Parse content array to extract tasks and blockers
  const content = standup.content || [];
  const tasks: Task[] = [];
  let blockers = '';

  // Parse content array - each item could be a task or blocker
  content.forEach((item: string, index: number) => {
    if (item.toLowerCase().includes('blocker') || item.toLowerCase().includes('challenge')) {
      // Extract blocker text (remove "Blockers:" prefix if present)
      blockers = item.replace(/^blockers?:\s*/i, '').trim();
    } else {
      // Treat as a task
      tasks.push({
        id: `task-${standup.id}-${index}`,
        text: item.trim(),
        completed: false
      });
    }
  });

  return {
    ...standup,
    tasks,
    blockers,
    memberId: standup.member_id?.toString() || '',
    memberName: standup.member?.name || 'Unknown Member',
    memberAvatar: `https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face`,
    timestamp: standup.created_at || new Date().toISOString()
  };
};

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const { user, setUser } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [standups, setStandups] = useState<Standup[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('name');
      
      if (!error && data) {
        setTeams(data);
        console.log('Teams fetched successfully:', data);
      } else {
        console.error('Error fetching teams:', error);
      }
    } catch (error) {
      console.error('Error in fetchTeams:', error);
    }
  };

  const fetchMembers = async () => {
    try {
      // First fetch members with team information
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select(`
          *,
          team:teams(*)
        `)
        .order('name');
      
      if (membersError) {
        console.error('Error fetching members:', membersError);
        return;
      }

      // Then fetch mentor information separately for each member that has a mentor_id
      const membersWithMentors = await Promise.all(
        (membersData || []).map(async (member) => {
          if (member.mentor_id) {
            const { data: mentorData } = await supabase
              .from('members')
              .select('id, name, email, role')
              .eq('id', member.mentor_id)
              .single();
            
            return {
              ...member,
              mentor: mentorData
            };
          }
          return member;
        })
      );

      setMembers(membersWithMentors);
      console.log('Members fetched successfully:', membersWithMentors);
    } catch (error) {
      console.error('Error in fetchMembers:', error);
    }
  };

  const fetchMentors = async (): Promise<Member[]> => {
    try {
      console.log('Fetching mentors from database...');
      const { data, error } = await supabase
        .from('members')
        .select(`
          id,
          name,
          email,
          role,
          team_id,
          team:teams(name)
        `)
        .eq('role', 'mentor')
        .order('name');
      
      if (!error && data) {
        console.log('Mentors fetched successfully:', data);
        return data;
      } else {
        console.error('Error fetching mentors:', error);
        return [];
      }
    } catch (error) {
      console.error('Error in fetchMentors:', error);
      return [];
    }
  };

  const fetchStandups = async () => {
    try {
      console.log('Fetching standups...');
      const { data, error } = await supabase
        .from('standups')
        .select(`
          *,
          member:members(*),
          team:teams(*)
        `)
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        console.log('Raw standups data from database:', data);
        // Transform the data to match StandupCard expectations
        const transformedStandups = data.map(transformStandupData);
        setStandups(transformedStandups);
        console.log('Standups fetched and transformed successfully:', transformedStandups);
      } else {
        console.error('Error fetching standups:', error);
        setStandups([]); // Set empty array on error
      }
    } catch (error) {
      console.error('Error in fetchStandups:', error);
      setStandups([]); // Set empty array on error
    }
  };

  const fetchLeaves = async () => {
    try {
      const { data, error } = await supabase
        .from('leaves')
        .select(`
          *,
          member:members(*),
          team:teams(*)
        `)
        .order('date', { ascending: false });
      
      if (!error && data) {
        setLeaves(data);
        console.log('Leaves fetched successfully:', data);
      } else {
        console.error('Error fetching leaves:', error);
      }
    } catch (error) {
      console.error('Error in fetchLeaves:', error);
    }
  };

  const refreshCurrentUser = async () => {
    if (!user) return;
    
    try {
      console.log('Refreshing current user data...');
      const { data: updatedMember, error } = await supabase
        .from('members')
        .select(`
          *,
          team:teams(*)
        `)
        .eq('id', user.id)
        .single();

      if (!error && updatedMember) {
        // Fetch mentor information separately if mentor_id exists
        let mentorData = null;
        if (updatedMember.mentor_id) {
          const { data: mentor } = await supabase
            .from('members')
            .select('id, name, email, role')
            .eq('id', updatedMember.mentor_id)
            .single();
          mentorData = mentor;
        }

        const updatedUser = {
          ...user,
          mentor_id: updatedMember.mentor_id,
          team: updatedMember.team,
        };
        
        // Update user in auth context
        if (setUser) {
          setUser(updatedUser);
        }
        
        // Update localStorage
        localStorage.setItem('auth_user', JSON.stringify(updatedUser));
        
        console.log('Current user refreshed successfully:', updatedUser);
      } else {
        console.error('Error refreshing current user:', error);
      }
    } catch (error) {
      console.error('Error in refreshCurrentUser:', error);
    }
  };

  const refreshData = async () => {
    console.log('Refreshing all data...');
    setLoading(true);
    try {
      await Promise.all([
        fetchTeams(),
        fetchMembers(),
        fetchStandups(),
        fetchLeaves(),
      ]);
      console.log('Data refresh completed');
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      console.log('User authenticated, fetching data for user:', user);
      refreshData();
    } else {
      console.log('No user authenticated, skipping data fetch');
      setLoading(false);
    }
  }, [user]);

  // Check if user is on approved leave for a specific date
  const isUserOnLeave = (memberId: number, date: Date = new Date()): boolean => {
    const dateString = getLocalDateString(date);
    const userLeave = leaves.find(leave => 
      leave.member_id === memberId && 
      leave.date === dateString && 
      leave.approved === true
    );
    return !!userLeave;
  };

  // Check if user should skip standup (on approved leave)
  const shouldSkipStandup = (memberId: number, date: Date = new Date()): boolean => {
    return isUserOnLeave(memberId, date);
  };

  // Get detailed leave status for a user on a specific date
  const getUserLeaveStatus = (memberId: number, date: Date = new Date()) => {
    const dateString = getLocalDateString(date);
    const userLeave = leaves.find(leave => 
      leave.member_id === memberId && 
      leave.date === dateString && 
      leave.approved === true
    );
    
    if (userLeave) {
      return {
        onLeave: true,
        leaveType: userLeave.type,
        reason: userLeave.reason
      };
    }
    
    return { onLeave: false };
  };

  const createStandup = async (content: string[]): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      const today = getLocalDateString(); // Use local date string
      
      // Check if user is on approved leave today
      if (shouldSkipStandup(user.id)) {
        return { success: false, error: 'You are on approved leave today. Standup creation is not required.' };
      }
      
      console.log('Creating standup with content:', content, 'for user:', user.id, 'team:', user.team_id, 'date:', today);
      
      // Check if user already has a standup today
      const { data: existingStandup } = await supabase
        .from('standups')
        .select('id')
        .eq('member_id', user.id)
        .eq('date', today)
        .maybeSingle();

      if (existingStandup) {
        // Update existing standup
        const { error } = await supabase
          .from('standups')
          .update({
            content,
            created_at: new Date().toISOString(),
          })
          .eq('id', existingStandup.id);

        if (error) {
          console.error('Error updating standup:', error);
          return { success: false, error: 'Failed to update standup' };
        }
        console.log('Standup updated successfully');
      } else {
        // Create new standup
        const { error } = await supabase
          .from('standups')
          .insert({
            member_id: user.id,
            team_id: user.team_id,
            date: today,
            content,
            created_at: new Date().toISOString(),
          });

        if (error) {
          console.error('Error creating standup:', error);
          return { success: false, error: 'Failed to create standup' };
        }
        console.log('Standup created successfully');
      }

      // Refresh standups data
      await fetchStandups();
      return { success: true };
    } catch (error) {
      console.error('Standup creation error:', error);
      return { success: false, error: 'An error occurred' };
    }
  };

  const createLeaveRequest = async (leaveData: Omit<Leave, 'id' | 'member_id' | 'team_id' | 'approved'>): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      // Check if user already has a leave request for this date
      const { data: existingLeave } = await supabase
        .from('leaves')
        .select('id')
        .eq('member_id', user.id)
        .eq('date', leaveData.date)
        .maybeSingle();

      if (existingLeave) {
        return { success: false, error: 'You already have a leave request for this date' };
      }

      const { error } = await supabase
        .from('leaves')
        .insert({
          member_id: user.id,
          team_id: user.team_id,
          date: leaveData.date,
          reason: leaveData.reason,
          type: leaveData.type,
          approved: false,
        });

      if (error) {
        return { success: false, error: 'Failed to create leave request' };
      }

      await fetchLeaves();
      return { success: true };
    } catch (error) {
      console.error('Leave request creation error:', error);
      return { success: false, error: 'An error occurred' };
    }
  };

  const approveLeave = async (leaveId: number): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('leaves')
        .update({ approved: true })
        .eq('id', leaveId);

      if (error) {
        return { success: false, error: 'Failed to approve leave' };
      }

      await fetchLeaves();
      return { success: true };
    } catch (error) {
      console.error('Leave approval error:', error);
      return { success: false, error: 'An error occurred' };
    }
  };

  const rejectLeave = async (leaveId: number): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('leaves')
        .delete()
        .eq('id', leaveId);

      if (error) {
        return { success: false, error: 'Failed to reject leave' };
      }

      await fetchLeaves();
      return { success: true };
    } catch (error) {
      console.error('Leave rejection error:', error);
      return { success: false, error: 'An error occurred' };
    }
  };

  const cancelLeave = async (leaveId: number): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('leaves')
        .delete()
        .eq('id', leaveId);

      if (error) {
        return { success: false, error: 'Failed to cancel leave request' };
      }

      await fetchLeaves();
      return { success: true };
    } catch (error) {
      console.error('Leave cancellation error:', error);
      return { success: false, error: 'An error occurred' };
    }
  };

  const assignMentor = async (mentorId: number): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      console.log('Assigning mentor:', mentorId, 'to user:', user.id);
      
      const { error } = await supabase
        .from('members')
        .update({ mentor_id: mentorId })
        .eq('id', user.id);

      if (error) {
        console.error('Error assigning mentor:', error);
        return { success: false, error: 'Failed to assign mentor' };
      }

      console.log('Mentor assigned successfully');
      
      // Refresh members data and current user
      await Promise.all([
        fetchMembers(),
        refreshCurrentUser()
      ]);
      
      return { success: true };
    } catch (error) {
      console.error('Mentor assignment error:', error);
      return { success: false, error: 'An error occurred' };
    }
  };

  const getTeamById = (id: number): Team | undefined => {
    const team = teams.find(team => team.id === id);
    console.log('Looking for team with id:', id, 'Found:', team, 'Available teams:', teams);
    return team;
  };

  const getMembersByTeamId = (teamId: number): Member[] => {
    const teamMembers = members.filter(member => member.team_id === teamId);
    console.log('Getting members for team:', teamId, 'Found:', teamMembers);
    return teamMembers;
  };

  const getStandupsByTeamAndDate = (teamId: number, date: Date): Standup[] => {
    const dateString = getLocalDateString(date); // Use local date string
    const teamStandups = standups.filter(standup => 
      standup.team_id === teamId && standup.date === dateString
    );
    console.log('Getting standups for team:', teamId, 'date:', dateString, 'Found:', teamStandups);
    return teamStandups;
  };

  const getStandupsByMemberId = (memberId: number): Standup[] => {
    const memberStandups = standups.filter(standup => standup.member_id === memberId);
    console.log('Getting standups for member:', memberId, 'Found:', memberStandups, 'All standups:', standups);
    return memberStandups;
  };

  const getTodaysStandupByMember = (memberId: number): Standup | undefined => {
    const today = getLocalDateString(); // Use local date string
    const todayStandup = standups.find(standup => 
      standup.member_id === memberId && standup.date === today
    );
    console.log('Getting today\'s standup for member:', memberId, 'date:', today, 'Found:', todayStandup);
    return todayStandup;
  };

  const getPendingLeavesByTeam = (teamId: number): Leave[] => {
    return leaves.filter(leave => 
      leave.team_id === teamId && leave.approved === false
    );
  };

  const getMemberById = (memberId: string): Member | undefined => {
    const member = members.find(member => member.id === parseInt(memberId));
    console.log('Getting member by id:', memberId, 'Found:', member);
    return member;
  };

  const getMentorById = (mentorId: number): Member | undefined => {
    const mentor = members.find(member => member.id === mentorId && member.role === 'mentor');
    console.log('Getting mentor by id:', mentorId, 'Found:', mentor);
    return mentor;
  };

  const getMentors = (): Member[] => {
    return members.filter(member => member.role === 'mentor');
  };

  // Mock functions for compatibility
  const toggleTaskCompletion = (standupId: number, taskId: string) => {
    console.log('Toggle task completion:', standupId, taskId);
    // This would need to be implemented based on your task structure
    // For now, just update local state
    setStandups(prev => prev.map(standup => {
      if (standup.id === standupId) {
        return {
          ...standup,
          tasks: standup.tasks.map(task => 
            task.id === taskId ? { ...task, completed: !task.completed } : task
          )
        };
      }
      return standup;
    }));
  };

  const addStandup = (standup: any) => {
    console.log('Add standup:', standup);
    // This would add a standup to the local state
    setStandups(prev => [standup, ...prev]);
  };

  const updateStandup = (standupId: number, updates: any) => {
    console.log('Update standup:', standupId, updates);
    // This would update a standup in the local state
    setStandups(prev => prev.map(standup => 
      standup.id === standupId ? { ...standup, ...updates } : standup
    ));
  };

  return (
    <AppContext.Provider value={{
      teams,
      members,
      standups,
      leaves,
      loading,
      selectedDate,
      setSelectedDate,
      createStandup,
      createLeaveRequest,
      approveLeave,
      rejectLeave,
      cancelLeave,
      assignMentor,
      refreshData,
      getTeamById,
      getMembersByTeamId,
      getStandupsByTeamAndDate,
      getStandupsByMemberId,
      getTodaysStandupByMember,
      getPendingLeavesByTeam,
      currentUser: user,
      toggleTaskCompletion,
      addStandup,
      updateStandup,
      getMemberById,
      isUserOnLeave,
      shouldSkipStandup,
      getUserLeaveStatus,
      getMentorById,
      getMentors,
      fetchMentors,
      refreshCurrentUser,
    }}>
      {children}
    </AppContext.Provider>
  );
};