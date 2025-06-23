export interface Team {
  id: number;
  name: string;
  description: string;
}

export interface Member {
  id: number;
  name: string;
  email: string;
  phone?: string;
  internship_start?: string;
  internship_end?: string;
  team_id: number;
  role: 'trainee' | 'mentor';
  username: string;
  password?: string;
  admin: boolean;
  mentor_id?: number; // Add mentor_id field
  team?: Team;
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
}

export interface Standup {
  id: number;
  member_id: number;
  team_id: number;
  date: string;
  content: string[];
  created_at: string;
  member?: Member;
  team?: Team;
  // Add computed properties for compatibility with StandupCard
  tasks: Task[];
  blockers: string;
  memberId: string;
  memberName: string;
  memberAvatar: string;
  timestamp: string;
}

export interface Leave {
  id: number;
  member_id: number;
  team_id: number;
  date: string;
  reason: string;
  type: 'sick' | 'personal' | 'other';
  approved: boolean;
  member?: Member;
  team?: Team;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  username: string;
  role: 'trainee' | 'mentor';
  admin: boolean;
  team_id: number;
  mentor_id?: number; // Add mentor_id field
  team?: Team;
}