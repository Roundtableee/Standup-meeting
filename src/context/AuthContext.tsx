import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { AuthUser, Team } from '../types';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (userData: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  setUser: (user: AuthUser | null) => void;
  updateProfile: (updates: Partial<AuthUser>) => Promise<{ success: boolean; error?: string }>;
  uploadProfilePicture: (file: File) => Promise<{ success: boolean; url?: string; error?: string }>;
  removeProfilePicture: () => Promise<{ success: boolean; error?: string }>;
}

interface RegisterData {
  name: string;
  email: string;
  phone?: string;
  username: string;
  password: string;
  team_id: number;
  role: 'trainee' | 'mentor';
  internship_start?: string;
  internship_end?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in from localStorage
    const savedUser = localStorage.getItem('auth_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('auth_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      
      // Query the members table for authentication with simplified mentor query
      const { data: member, error } = await supabase
        .from('members')
        .select(`
          *,
          team:teams(*)
        `)
        .eq('username', username)
        .eq('password', password)
        .single();

      if (error || !member) {
        return { success: false, error: 'Invalid username or password' };
      }

      // Fetch mentor information separately if mentor_id exists
      let mentorData = null;
      if (member.mentor_id) {
        const { data: mentor } = await supabase
          .from('members')
          .select('id, name, email, role')
          .eq('id', member.mentor_id)
          .single();
        mentorData = mentor;
      }

      const authUser: AuthUser = {
        id: member.id,
        name: member.name || '',
        email: member.email || '',
        username: member.username || '',
        role: member.role || 'trainee',
        admin: member.admin || false,
        team_id: member.team_id || 0,
        mentor_id: member.mentor_id || undefined,
        profile_picture: member.profile_picture || undefined,
        description: member.description || undefined,
        team: member.team || undefined,
      };

      setUser(authUser);
      localStorage.setItem('auth_user', JSON.stringify(authUser));
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'An error occurred during login' };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: RegisterData): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);

      // Check if username already exists
      const { data: existingUser } = await supabase
        .from('members')
        .select('username')
        .eq('username', userData.username)
        .single();

      if (existingUser) {
        return { success: false, error: 'Username already exists' };
      }

      // Insert new member
      const { data: newMember, error } = await supabase
        .from('members')
        .insert({
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          username: userData.username,
          password: userData.password,
          team_id: userData.team_id,
          role: userData.role,
          admin: false,
          mentor_id: null,
          internship_start: userData.internship_start,
          internship_end: userData.internship_end,
        })
        .select(`
          *,
          team:teams(*)
        `)
        .single();

      if (error || !newMember) {
        return { success: false, error: 'Failed to create account' };
      }

      const authUser: AuthUser = {
        id: newMember.id,
        name: newMember.name || '',
        email: newMember.email || '',
        username: newMember.username || '',
        role: newMember.role || 'trainee',
        admin: newMember.admin || false,
        team_id: newMember.team_id || 0,
        mentor_id: newMember.mentor_id || undefined,
        profile_picture: newMember.profile_picture || undefined,
        description: newMember.description || undefined,
        team: newMember.team || undefined,
      };

      setUser(authUser);
      localStorage.setItem('auth_user', JSON.stringify(authUser));
      
      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'An error occurred during registration' };
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<AuthUser>): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('members')
        .update({
          name: updates.name,
          email: updates.email,
          description: updates.description,
          profile_picture: updates.profile_picture,
        })
        .eq('id', user.id);

      if (error) {
        return { success: false, error: 'Failed to update profile' };
      }

      // Update local user state
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem('auth_user', JSON.stringify(updatedUser));

      return { success: true };
    } catch (error) {
      console.error('Profile update error:', error);
      return { success: false, error: 'An error occurred while updating profile' };
    }
  };

  const uploadProfilePicture = async (file: File): Promise<{ success: boolean; url?: string; error?: string }> => {
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      
      // Convert file to base64 for storage (in a real app, you'd upload to a file storage service)
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const base64Url = await base64Promise;

      // Update profile picture in database
      const result = await updateProfile({ profile_picture: base64Url });
      
      if (result.success) {
        return { success: true, url: base64Url };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Profile picture upload error:', error);
      return { success: false, error: 'Failed to upload profile picture' };
    }
  };

  const removeProfilePicture = async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      const result = await updateProfile({ profile_picture: undefined });
      return result;
    } catch (error) {
      console.error('Profile picture removal error:', error);
      return { success: false, error: 'Failed to remove profile picture' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth_user');
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      logout,
      setUser,
      updateProfile,
      uploadProfilePicture,
      removeProfilePicture,
    }}>
      {children}
    </AuthContext.Provider>
  );
};