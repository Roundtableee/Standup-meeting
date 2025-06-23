import React from 'react';
import { Users, ArrowRight } from 'lucide-react';
import { Team } from '../../types';

interface TeamCardProps {
  team: Team;
  onClick: () => void;
  memberCount: number;
}

const TeamCard: React.FC<TeamCardProps> = ({ team, onClick, memberCount }) => {
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
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg hover:scale-105 transition-all duration-200 cursor-pointer group"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`${getTeamColor(team.id)} p-3 rounded-lg`}>
          <Users className="h-6 w-6 text-white" />
        </div>
        <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors duration-200" />
      </div>
      
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{team.name}</h3>
      <p className="text-gray-600 text-sm mb-4 leading-relaxed">{team.description}</p>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center text-sm text-gray-500">
          <Users className="h-4 w-4 mr-1" />
          {memberCount} members
        </div>
        <div className="text-sm font-medium text-blue-600 group-hover:text-blue-700">
          View Team →
        </div>
      </div>
    </div>
  );
};

export default TeamCard;