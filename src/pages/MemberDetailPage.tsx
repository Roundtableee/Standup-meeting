import React, { useState } from 'react';
import { ArrowLeft, Calendar, User, Briefcase, Clock, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Layout/Header';
import StandupCard from '../components/Standup/StandupCard';

interface MemberDetailPageProps {
  memberId: string;
  onBack: () => void;
  onProfileClick?: () => void;
}

const MemberDetailPage: React.FC<MemberDetailPageProps> = ({ memberId, onBack, onProfileClick }) => {
  const { user } = useAuth();
  const { getMemberById, getStandupsByMemberId, standups, leaves } = useApp();
  const [viewMode, setViewMode] = useState<'recent' | 'calendar'>('recent');
  
  const member = getMemberById(memberId);
  const memberStandups = getStandupsByMemberId(parseInt(memberId));

  console.log('MemberDetailPage - memberId:', memberId, 'member:', member, 'standups:', memberStandups);

  if (!member) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        <Header 
          title="Member Not Found" 
          user={user} 
          onProfileClick={onProfileClick}
          onBack={onBack}
          showBackButton={true}
        />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Member Not Found</h2>
            <p className="text-gray-600 mb-4">The member you're looking for doesn't exist or you don't have access to them.</p>
            <p className="text-sm text-gray-500 mb-4">Member ID: {memberId}</p>
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

  const recentStandups = memberStandups.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString([], { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getPositionBadge = () => {
    if (member.internship_start && member.internship_end) {
      return (
        <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800 border border-orange-200">
          <User className="h-4 w-4 mr-1" />
          Intern
        </div>
      );
    }
    
    return (
      <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200">
        <Briefcase className="h-4 w-4 mr-1" />
        {member.role === 'mentor' ? 'Mentor' : 'Trainee'}
      </div>
    );
  };

  const renderCalendarView = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    
    const standupDates = recentStandups.map(s => s.date);
    const memberLeaveDates = leaves
      .filter(leave => leave.member_id === parseInt(memberId) && leave.approved === true)
      .map(leave => leave.date);
    
    const days = [];
    
    // Empty cells for days before the first day of month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const hasStandup = standupDates.includes(dateString);
      const hasLeave = memberLeaveDates.includes(dateString);
      const isToday = today.getDate() === day;
      const isWeekday = new Date(currentYear, currentMonth, day).getDay() >= 1 && new Date(currentYear, currentMonth, day).getDay() <= 5;
      
      days.push({
        day,
        hasStandup,
        hasLeave,
        isToday,
        isWeekday,
        dateString
      });
    }

    const getDayClasses = (dayData: any) => {
      const baseClasses = 'w-full h-full flex items-center justify-center text-sm rounded-lg';
      
      if (dayData.isToday) {
        return `${baseClasses} bg-blue-100 text-blue-700 border border-blue-300 font-medium`;
      }
      
      if (dayData.isWeekday) {
        if (dayData.hasLeave) {
          return `${baseClasses} bg-yellow-100 text-yellow-800 border border-yellow-300`;
        }
        if (dayData.hasStandup) {
          return `${baseClasses} bg-green-100 text-green-800 border border-green-300`;
        }
        return `${baseClasses} bg-gray-50 text-gray-700`;
      }
      
      // Weekend
      return `${baseClasses} bg-gray-50 text-gray-500`;
    };

    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Activity Calendar - {today.toLocaleDateString([], { month: 'long', year: 'numeric' })}
        </h3>
        
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-2 text-center text-xs font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 mb-4">
          {days.map((dayData, index) => (
            <div key={index} className="aspect-square">
              {dayData && (
                <div className={getDayClasses(dayData)}>
                  {dayData.day}
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="flex items-center justify-center space-x-6 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-100 border border-green-300 rounded mr-2"></div>
            <span className="text-gray-600">Standup completed</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded mr-2"></div>
            <span className="text-gray-600">Leave day</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-gray-200 rounded mr-2"></div>
            <span className="text-gray-600">No activity</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <Header 
        title={`${member.name} - Standup History`} 
        user={user} 
        onProfileClick={onProfileClick}
        onBack={onBack}
        showBackButton={true}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Member Profile Section */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start mb-6 lg:mb-0">
              <img
                src={`https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face`}
                alt={member.name}
                className="h-24 w-24 rounded-full ring-4 ring-gray-100 flex-shrink-0"
              />
              <div className="ml-6">
                <div className="flex items-center mb-3">
                  <h2 className="text-3xl font-bold text-gray-900 mr-4">{member.name}</h2>
                  {getPositionBadge()}
                </div>
                <p className="text-xl text-gray-700 font-medium mb-2">{member.role}</p>
                <p className="text-gray-600 mb-3">{member.email}</p>
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar className="h-4 w-4 mr-2" />
                  Member since {new Date().toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Internship Information */}
            {member.internship_start && member.internship_end && (
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-6 lg:max-w-sm">
                <div className="flex items-center mb-3">
                  <Clock className="h-5 w-5 text-orange-600 mr-2" />
                  <h3 className="text-lg font-semibold text-orange-900">Internship Period</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-orange-700 font-medium">Start Date:</span>
                    <span className="text-orange-900">{formatDate(member.internship_start)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-orange-700 font-medium">End Date:</span>
                    <span className="text-orange-900">{formatDate(member.internship_end)}</span>
                  </div>
                  <div className="pt-2 border-t border-orange-200">
                    <span className="text-orange-700 font-medium">Duration:</span>
                    <span className="text-orange-900 ml-2">
                      {Math.ceil((new Date(member.internship_end).getTime() - new Date(member.internship_start).getTime()) / (1000 * 60 * 60 * 24 * 30))} months
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="mb-6">
          <div className="flex items-center space-x-1 bg-white rounded-lg shadow-md border border-gray-200 p-1">
            <button
              onClick={() => setViewMode('recent')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                viewMode === 'recent'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Recent Standups
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                viewMode === 'calendar'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Calendar View
            </button>
          </div>
        </div>

        {/* Content */}
        {viewMode === 'recent' ? (
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              Recent Standups ({recentStandups.length})
            </h3>
            
            {recentStandups.length > 0 ? (
              <div className="space-y-6">
                {recentStandups.map(standup => (
                  <StandupCard key={standup.id} standup={standup} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md border border-gray-200 p-12 text-center">
                <div className="text-gray-400 mb-4">
                  <AlertCircle className="h-12 w-12 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No standups yet
                </h3>
                <p className="text-gray-500">
                  This member hasn't submitted any standups yet.
                </p>
              </div>
            )}
          </div>
        ) : (
          renderCalendarView()
        )}
      </main>
    </div>
  );
};

export default MemberDetailPage;