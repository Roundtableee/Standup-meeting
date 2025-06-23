import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, Search, Calendar, CheckCircle, Clock, AlertCircle, User, Mail, Briefcase, FileText, TrendingUp, XCircle, Edit } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import Header from '../components/Layout/Header';
import StandupCard from '../components/Standup/StandupCard';
import { Member, Standup, Leave } from '../types';

interface MentorTraineesPageProps {
  onBack: () => void;
  onProfileClick?: () => void;
}

const MentorTraineesPage: React.FC<MentorTraineesPageProps> = ({ onBack, onProfileClick }) => {
  const { user } = useAuth();
  const { members, standups, leaves, approveLeave, rejectLeave, createLeaveRequest } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTrainee, setSelectedTrainee] = useState<Member | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'standups' | 'leaves'>('overview');
  const [loading, setLoading] = useState<string | null>(null);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveData, setLeaveData] = useState({
    date: '',
    reason: '',
    type: 'personal' as 'sick' | 'personal' | 'other',
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Get trainees assigned to this mentor
  const myTrainees = members.filter(member => 
    member.mentor_id === user?.id && member.role === 'trainee'
  );

  // Filter trainees based on search term
  const filteredTrainees = myTrainees.filter(trainee =>
    trainee.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    trainee.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    trainee.id.toString().includes(searchTerm)
  );

  // Get trainee's recent standups
  const getTraineeStandups = (traineeId: number) => {
    return standups
      .filter(standup => standup.member_id === traineeId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10); // Last 10 standups
  };

  // Get trainee's leave requests
  const getTraineeLeaves = (traineeId: number) => {
    return leaves
      .filter(leave => leave.member_id === traineeId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  // Get trainee's pending leave requests
  const getTraineePendingLeaves = (traineeId: number) => {
    return leaves.filter(leave => 
      leave.member_id === traineeId && leave.approved === false
    );
  };

  // Calculate trainee stats
  const getTraineeStats = (traineeId: number) => {
    const traineeStandups = getTraineeStandups(traineeId);
    const traineeLeaves = getTraineeLeaves(traineeId);
    const pendingLeaves = getTraineePendingLeaves(traineeId);
    
    // Calculate standup completion rate for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentStandups = traineeStandups.filter(standup => 
      new Date(standup.date) >= thirtyDaysAgo
    );
    
    // Count weekdays in the last 30 days
    let weekdaysCount = 0;
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayOfWeek = date.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday to Friday
        weekdaysCount++;
      }
    }
    
    const completionRate = weekdaysCount > 0 ? Math.round((recentStandups.length / weekdaysCount) * 100) : 0;
    
    return {
      totalStandups: traineeStandups.length,
      recentStandups: recentStandups.length,
      completionRate,
      totalLeaves: traineeLeaves.length,
      pendingLeaves: pendingLeaves.length,
      approvedLeaves: traineeLeaves.filter(leave => leave.approved === true).length
    };
  };

  const handleApproveLeave = async (leaveId: number) => {
    setLoading(`approve-${leaveId}`);
    try {
      const result = await approveLeave(leaveId);
      if (result.success) {
        setMessage({ type: 'success', text: 'Leave request approved successfully!' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to approve leave' });
      }
    } catch (error) {
      console.error('Error approving leave:', error);
      setMessage({ type: 'error', text: 'An error occurred while approving leave' });
    } finally {
      setLoading(null);
    }
  };

  const handleRejectLeave = async (leaveId: number) => {
    setLoading(`reject-${leaveId}`);
    try {
      const result = await rejectLeave(leaveId);
      if (result.success) {
        setMessage({ type: 'success', text: 'Leave request rejected successfully!' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to reject leave' });
      }
    } catch (error) {
      console.error('Error rejecting leave:', error);
      setMessage({ type: 'error', text: 'An error occurred while rejecting leave' });
    } finally {
      setLoading(null);
    }
  };

  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveData.date || !leaveData.reason.trim()) return;

    setLoading('leave-submit');
    setMessage(null);

    try {
      const result = await createLeaveRequest(leaveData);

      if (result.success) {
        setMessage({ type: 'success', text: 'Leave request submitted successfully!' });
        setLeaveData({ date: '', reason: '', type: 'personal' });
        setShowLeaveForm(false);
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to submit leave request' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getLeaveTypeColor = (type: string) => {
    switch (type) {
      case 'sick':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'personal':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!user || user.role !== 'mentor') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-4">This page is only accessible to mentors.</p>
          <button
            onClick={onBack}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <Header 
        title="My Trainees" 
        user={user} 
        onProfileClick={onProfileClick}
        onBack={onBack}
        showBackButton={true}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Message Display */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg border ${
            message.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center">
              {message.type === 'success' ? (
                <CheckCircle className="h-5 w-5 mr-2" />
              ) : (
                <AlertCircle className="h-5 w-5 mr-2" />
              )}
              {message.text}
            </div>
          </div>
        )}

        {/* Overview Stats */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-3 rounded-lg mr-4">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">My Trainees Overview</h2>
                <p className="text-gray-600">Manage and monitor your assigned trainees</p>
              </div>
            </div>
            
            {/* Mentor Leave Request Button */}
            <button
              onClick={() => setShowLeaveForm(true)}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white font-medium rounded-lg hover:from-orange-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Request My Leave
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Total Trainees</p>
                  <p className="text-2xl font-bold text-blue-900">{myTrainees.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-green-800">Active Standups</p>
                  <p className="text-2xl font-bold text-green-900">
                    {standups.filter(s => {
                      const today = new Date().toISOString().split('T')[0];
                      return s.date === today && myTrainees.some(t => t.id === s.member_id);
                    }).length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-orange-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-orange-800">Pending Leaves</p>
                  <p className="text-2xl font-bold text-orange-900">
                    {leaves.filter(l => 
                      l.approved === false && myTrainees.some(t => t.id === l.member_id)
                    ).length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-purple-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-purple-800">Avg Completion</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {myTrainees.length > 0 
                      ? Math.round(myTrainees.reduce((acc, trainee) => 
                          acc + getTraineeStats(trainee.id).completionRate, 0) / myTrainees.length)
                      : 0}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mentor Leave Request Modal */}
        {showLeaveForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Request My Leave</h3>
                <button
                  onClick={() => setShowLeaveForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleLeaveSubmit} className="space-y-4">
                <div>
                  <label htmlFor="leave_date" className="block text-sm font-medium text-gray-700 mb-2">
                    Leave Date *
                  </label>
                  <input
                    type="date"
                    id="leave_date"
                    value={leaveData.date}
                    onChange={(e) => setLeaveData(prev => ({ ...prev, date: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="leave_type" className="block text-sm font-medium text-gray-700 mb-2">
                    Leave Type *
                  </label>
                  <select
                    id="leave_type"
                    value={leaveData.type}
                    onChange={(e) => setLeaveData(prev => ({ ...prev, type: e.target.value as 'sick' | 'personal' | 'other' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                  >
                    <option value="personal">Personal</option>
                    <option value="sick">Sick Leave</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="leave_reason" className="block text-sm font-medium text-gray-700 mb-2">
                    Reason *
                  </label>
                  <textarea
                    id="leave_reason"
                    rows={3}
                    value={leaveData.reason}
                    onChange={(e) => setLeaveData(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="Please provide a reason for your leave request..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 resize-none"
                    required
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowLeaveForm(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading === 'leave-submit' || !leaveData.date || !leaveData.reason.trim()}
                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white font-medium rounded-lg hover:from-orange-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading === 'leave-submit' ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Calendar className="h-4 w-4 mr-2" />
                        Submit Request
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Trainees List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Trainees ({myTrainees.length})</h3>
              </div>

              {/* Search */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search trainees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>

              {/* Trainees List */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredTrainees.length > 0 ? (
                  filteredTrainees.map(trainee => {
                    const stats = getTraineeStats(trainee.id);
                    const isSelected = selectedTrainee?.id === trainee.id;
                    
                    return (
                      <div
                        key={trainee.id}
                        className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedTrainee(trainee)}
                      >
                        <div className="flex items-center mb-2">
                          <div className="bg-orange-100 p-2 rounded-full mr-3">
                            <User className="h-4 w-4 text-orange-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 text-sm">{trainee.name}</p>
                            <p className="text-xs text-gray-600">{trainee.email}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-green-100 rounded p-2 text-center">
                            <p className="font-medium text-green-800">{stats.completionRate}%</p>
                            <p className="text-green-600">Completion</p>
                          </div>
                          <div className="bg-orange-100 rounded p-2 text-center">
                            <p className="font-medium text-orange-800">{stats.pendingLeaves}</p>
                            <p className="text-orange-600">Pending</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">
                      {searchTerm ? 'No trainees found matching your search' : 'No trainees assigned yet'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Trainee Details */}
          <div className="lg:col-span-2">
            {selectedTrainee ? (
              <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
                {/* Trainee Header */}
                <div className="flex items-center mb-6">
                  <div className="bg-gradient-to-r from-orange-500 to-red-600 p-3 rounded-full mr-4">
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{selectedTrainee.name}</h3>
                    <p className="text-gray-600">{selectedTrainee.email}</p>
                    <p className="text-sm text-gray-500">ID: {selectedTrainee.id}</p>
                  </div>
                </div>

                {/* View Mode Tabs */}
                <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1 mb-6">
                  <button
                    onClick={() => setViewMode('overview')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                      viewMode === 'overview'
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setViewMode('standups')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                      viewMode === 'standups'
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Standups
                  </button>
                  <button
                    onClick={() => setViewMode('leaves')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                      viewMode === 'leaves'
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Leave Requests
                  </button>
                </div>

                {/* Content based on view mode */}
                {viewMode === 'overview' && (
                  <div className="space-y-6">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {(() => {
                        const stats = getTraineeStats(selectedTrainee.id);
                        return (
                          <>
                            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                              <div className="text-center">
                                <p className="text-2xl font-bold text-blue-900">{stats.recentStandups}</p>
                                <p className="text-sm text-blue-700">Standups (30 days)</p>
                              </div>
                            </div>
                            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                              <div className="text-center">
                                <p className="text-2xl font-bold text-green-900">{stats.completionRate}%</p>
                                <p className="text-sm text-green-700">Completion Rate</p>
                              </div>
                            </div>
                            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                              <div className="text-center">
                                <p className="text-2xl font-bold text-orange-900">{stats.pendingLeaves}</p>
                                <p className="text-sm text-orange-700">Pending Leaves</p>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    {/* Recent Activity */}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h4>
                      <div className="space-y-3">
                        {(() => {
                          const recentStandups = getTraineeStandups(selectedTrainee.id).slice(0, 3);
                          const recentLeaves = getTraineeLeaves(selectedTrainee.id).slice(0, 2);
                          
                          const activities = [
                            ...recentStandups.map(standup => ({
                              type: 'standup',
                              date: standup.date,
                              data: standup
                            })),
                            ...recentLeaves.map(leave => ({
                              type: 'leave',
                              date: leave.date,
                              data: leave
                            }))
                          ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

                          return activities.length > 0 ? activities.map((activity, index) => (
                            <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg">
                              {activity.type === 'standup' ? (
                                <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                              ) : (
                                <Calendar className="h-5 w-5 text-blue-600 mr-3" />
                              )}
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">
                                  {activity.type === 'standup' ? 'Submitted standup' : 'Requested leave'}
                                </p>
                                <p className="text-xs text-gray-600">{formatDate(activity.date)}</p>
                              </div>
                            </div>
                          )) : (
                            <p className="text-gray-500 text-sm">No recent activity</p>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}

                {viewMode === 'standups' && (
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-900">Recent Standups</h4>
                    {(() => {
                      const traineeStandups = getTraineeStandups(selectedTrainee.id);
                      return traineeStandups.length > 0 ? (
                        <div className="space-y-4 max-h-96 overflow-y-auto">
                          {traineeStandups.map(standup => (
                            <StandupCard key={standup.id} standup={standup} />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-500">No standups submitted yet</p>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {viewMode === 'leaves' && (
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-900">Leave Requests & Approval</h4>
                    {(() => {
                      const traineeLeaves = getTraineeLeaves(selectedTrainee.id);
                      return traineeLeaves.length > 0 ? (
                        <div className="space-y-4 max-h-96 overflow-y-auto">
                          {traineeLeaves.map(leave => (
                            <div key={leave.id} className="border border-gray-200 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-3">
                                  <Calendar className="h-4 w-4 text-blue-600" />
                                  <span className="font-medium text-gray-900">{formatDate(leave.date)}</span>
                                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getLeaveTypeColor(leave.type)}`}>
                                    {leave.type.charAt(0).toUpperCase() + leave.type.slice(1)}
                                  </div>
                                </div>
                                
                                <div className="flex items-center">
                                  {leave.approved === true ? (
                                    <div className="flex items-center text-green-600">
                                      <CheckCircle className="h-4 w-4 mr-1" />
                                      <span className="text-sm font-medium">Approved</span>
                                    </div>
                                  ) : leave.approved === false ? (
                                    <div className="flex items-center text-orange-600">
                                      <Clock className="h-4 w-4 mr-1" />
                                      <span className="text-sm font-medium">Pending</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center text-gray-600">
                                      <AlertCircle className="h-4 w-4 mr-1" />
                                      <span className="text-sm font-medium">Unknown</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <p className="text-sm text-gray-700 mb-3">{leave.reason}</p>
                              
                              {leave.approved === false && (
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handleApproveLeave(leave.id)}
                                    disabled={loading === `approve-${leave.id}`}
                                    className="inline-flex items-center px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {loading === `approve-${leave.id}` ? (
                                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                                    ) : (
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                    )}
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleRejectLeave(leave.id)}
                                    disabled={loading === `reject-${leave.id}`}
                                    className="inline-flex items-center px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {loading === `reject-${leave.id}` ? (
                                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                                    ) : (
                                      <AlertCircle className="h-3 w-3 mr-1" />
                                    )}
                                    Reject
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-500">No leave requests submitted yet</p>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md border border-gray-200 p-12 text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Trainee</h3>
                <p className="text-gray-500">
                  Choose a trainee from the list to view their details, standups, and manage their leave requests.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* All Trainees' Standups Section */}
        <div className="mt-8 bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center mb-6">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-3 rounded-lg mr-4">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">All Trainees' Standups</h2>
              <p className="text-gray-600">Recent standup submissions from all your trainees</p>
            </div>
          </div>

          <div className="space-y-4">
            {(() => {
              // Get all standups from trainees assigned to this mentor
              const allTraineeStandups = standups
                .filter(standup => myTrainees.some(trainee => trainee.id === standup.member_id))
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 10); // Show last 10 standups

              return allTraineeStandups.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {allTraineeStandups.map(standup => (
                    <StandupCard key={standup.id} standup={standup} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No standups submitted by your trainees yet</p>
                </div>
              );
            })()}
          </div>
        </div>

        {/* All Trainees' Leaves Section */}
        <div className="mt-8 bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center mb-6">
            <div className="bg-gradient-to-r from-orange-500 to-red-600 p-3 rounded-lg mr-4">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">All Trainees' Leave Requests</h2>
              <p className="text-gray-600">Manage leave requests from all your trainees</p>
            </div>
          </div>

          <div className="space-y-4">
            {(() => {
              // Get all leave requests from trainees assigned to this mentor
              const allTraineeLeaves = leaves
                .filter(leave => myTrainees.some(trainee => trainee.id === leave.member_id))
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

              return allTraineeLeaves.length > 0 ? (
                allTraineeLeaves.map(leave => {
                  const trainee = myTrainees.find(t => t.id === leave.member_id);
                  return (
                    <div key={leave.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex-1 mb-4 lg:mb-0">
                          <div className="flex items-center mb-3">
                            <div className="flex items-center mr-4">
                              <User className="h-5 w-5 text-gray-400 mr-2" />
                              <span className="font-semibold text-gray-900">
                                {trainee?.name || 'Unknown Trainee'}
                              </span>
                            </div>
                            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getLeaveTypeColor(leave.type)}`}>
                              {leave.type.charAt(0).toUpperCase() + leave.type.slice(1)}
                            </div>
                          </div>

                          <div className="flex items-center mb-3">
                            <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-gray-700">{formatDate(leave.date)}</span>
                          </div>

                          <div className="mb-3">
                            <p className="text-gray-700 text-sm leading-relaxed">{leave.reason}</p>
                          </div>

                          <div className="flex items-center">
                            {leave.approved === true ? (
                              <div className="flex items-center text-green-600">
                                <CheckCircle className="h-4 w-4 mr-1" />
                                <span className="text-sm font-medium">Approved</span>
                              </div>
                            ) : leave.approved === false ? (
                              <div className="flex items-center text-orange-600">
                                <Clock className="h-4 w-4 mr-1" />
                                <span className="text-sm font-medium">Pending</span>
                              </div>
                            ) : (
                              <div className="flex items-center text-gray-600">
                                <AlertCircle className="h-4 w-4 mr-1" />
                                <span className="text-sm font-medium">Unknown</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons for pending requests */}
                        {leave.approved === false && (
                          <div className="flex flex-col sm:flex-row gap-3">
                            <button
                              onClick={() => handleApproveLeave(leave.id)}
                              disabled={loading === `approve-${leave.id}`}
                              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {loading === `approve-${leave.id}` ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              ) : (
                                <CheckCircle className="h-4 w-4 mr-2" />
                              )}
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectLeave(leave.id)}
                              disabled={loading === `reject-${leave.id}`}
                              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {loading === `reject-${leave.id}` ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              ) : (
                                <XCircle className="h-4 w-4 mr-2" />
                              )}
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No leave requests from your trainees yet</p>
                </div>
              );
            })()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default MentorTraineesPage;