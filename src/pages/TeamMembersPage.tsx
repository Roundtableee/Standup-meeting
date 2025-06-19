import React, { useState } from 'react';
import { ArrowLeft, Search, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Layout/Header';
import MemberCard from '../components/Member/MemberCard';

interface TeamMembersPageProps {
  teamId: string;
  onBack: () => void;
  onMemberClick: (memberId: string) => void;
  onProfileClick?: () => void;
}

const TeamMembersPage: React.FC<TeamMembersPageProps> = ({ 
  teamId, 
  onBack, 
  onMemberClick,
  onProfileClick 
}) => {
  const { user } = useAuth();
  const { getTeamById, getMembersByTeamId, getStandupsByMemberId } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  
  const teamIdNumber = parseInt(teamId);
  const team = getTeamById(teamIdNumber);
  const members = getMembersByTeamId(teamIdNumber);

  console.log('TeamMembersPage - teamId:', teamId, 'team:', team, 'members:', members);

  const filteredMembers = members.filter(member =>
    member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!team) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        <Header 
          title="Team Not Found" 
          user={user} 
          onProfileClick={onProfileClick}
          onBack={onBack}
          showBackButton={true}
        />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Team Not Found</h2>
            <p className="text-gray-600 mb-4">The team you're looking for doesn't exist or you don't have access to it.</p>
            <p className="text-sm text-gray-500 mb-4">Team ID: {teamId}</p>
            <button
              onClick={onBack}
              className="inline-flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors duration-200"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </button>
          </div>
        </main>
      </div>
    );
  }

  const getMemberStandupCount = (memberId: string) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return getStandupsByMemberId(parseInt(memberId)).filter(standup => 
      new Date(standup.date) >= thirtyDaysAgo
    ).length;
  };

  const getTeamColor = (teamId: number) => {
    const colors = [
      'bg-blue-500',
      'bg-emerald-500', 
      'bg-purple-500',
      'bg-orange-500',
      'bg-pink-500',
      'bg-indigo-500'
    ];
    return colors[teamId % colors.length];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <Header 
        title={`${team.name} - Team Members`} 
        user={user} 
        onProfileClick={onProfileClick}
        onBack={onBack}
        showBackButton={true}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-6">
            <div className="flex items-center mb-4">
              <div className={`${getTeamColor(teamIdNumber)} p-3 rounded-lg mr-4`}>
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{team.name}</h2>
                <p className="text-gray-600">{team.description}</p>
              </div>
            </div>
            
            <div className="text-sm text-gray-500">
              {members.length} team members
            </div>
          </div>

          <div className="max-w-md mx-auto mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search team members..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMembers.map(member => (
            <MemberCard
              key={member.id}
              member={{
                id: member.id.toString(),
                name: member.name || 'Unknown',
                email: member.email || '',
                avatar: `https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face`,
                role: member.role || 'Member',
                teamId: member.team_id?.toString() || '',
                joinDate: new Date().toISOString(),
                position: 'full-time',
                internshipStart: member.internship_start,
                internshipEnd: member.internship_end,
              }}
              onClick={() => onMemberClick(member.id.toString())}
              standupCount={getMemberStandupCount(member.id.toString())}
            />
          ))}
        </div>

        {filteredMembers.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Search className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No members found</h3>
            <p className="text-gray-500">Try adjusting your search terms.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default TeamMembersPage;