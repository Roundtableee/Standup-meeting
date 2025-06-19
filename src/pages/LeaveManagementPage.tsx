import React, { useState } from 'react';
import { ArrowLeft, Calendar, CheckCircle, XCircle, AlertCircle, User, FileText, Trash2, Save, Plus, Check, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import Header from '../components/Layout/Header';

interface LeaveManagementPageProps {
  onBack: () => void;
  onProfileClick?: () => void;
}

const LeaveManagementPage: React.FC<LeaveManagementPageProps> = ({ onBack, onProfileClick }) => {
  const { user } = useAuth();
  const { 
    leaves, 
    members, 
    approveLeave, 
    rejectLeave, 
    cancelLeave, 
    createLeaveRequest
  } = useApp();
  
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'my-requests'>('all');
  const [loading, setLoading] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Leave request form state
  const [leaveData, setLeaveData] = useState({
    date: '',
    reason: '',
    type: 'personal' as 'sick' | 'personal' | 'other',
  });

  // Filter leaves based on user role and selected filter
  const getFilteredLeaves = () => {
    let filteredLeaves = leaves;

    // If user is a trainee, show only their requests
    if (user?.role === 'trainee') {
      filteredLeaves = leaves.filter(leave => leave.member_id === user.id);
    }

    // Apply additional filters
    switch (filter) {
      case 'pending':
        return filteredLeaves.filter(leave => leave.approved === false);
      case 'approved':
        return filteredLeaves.filter(leave => leave.approved === true);
      case 'my-requests':
        return filteredLeaves.filter(leave => leave.member_id === user?.id);
      default:
        return filteredLeaves;
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
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to submit leave request' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setLoading(null);
    }
  };

  const handleApprove = async (leaveId: number) => {
    setLoading(`approve-${leaveId}`);
    try {
      await approveLeave(leaveId);
    } catch (error) {
      console.error('Error approving leave:', error);
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async (leaveId: number) => {
    setLoading(`reject-${leaveId}`);
    try {
      await rejectLeave(leaveId);
    } catch (error) {
      console.error('Error rejecting leave:', error);
    } finally {
      setLoading(null);
    }
  };

  const handleCancel = async (leaveId: number) => {
    setLoading(`cancel-${leaveId}`);
    try {
      await cancelLeave(leaveId);
      setShowCancelConfirm(null);
    } catch (error) {
      console.error('Error cancelling leave:', error);
    } finally {
      setLoading(null);
    }
  };

  const getMemberName = (memberId: number) => {
    const member = members.find(m => m.id === memberId);
    return member?.name || 'Unknown Member';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString([], {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
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

  const getStatusIcon = (approved: boolean | null) => {
    if (approved === true) {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    } else if (approved === false) {
      return <AlertCircle className="h-5 w-5 text-orange-600" />;
    }
    return <AlertCircle className="h-5 w-5 text-gray-600" />;
  };

  const getStatusText = (approved: boolean | null) => {
    if (approved === true) return 'Approved';
    if (approved === false) return 'Pending';
    return 'Unknown';
  };

  const getStatusColor = (approved: boolean | null) => {
    if (approved === true) return 'text-green-600';
    if (approved === false) return 'text-orange-600';
    return 'text-gray-600';
  };

  const canCancelLeave = (leave: any) => {
    // Users can cancel their own pending requests
    // Users can also cancel their own approved requests if the leave date is in the future
    const isOwnRequest = leave.member_id === user?.id;
    const leaveDate = new Date(leave.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isFutureDate = leaveDate >= today;
    
    return isOwnRequest && (leave.approved === false || (leave.approved === true && isFutureDate));
  };

  const filteredLeaves = getFilteredLeaves().sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Not Authenticated</h2>
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
        title="Leave Management" 
        user={user} 
        onProfileClick={onProfileClick}
        onBack={onBack}
        showBackButton={true}
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Message Display */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg border ${
            message.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center">
              {message.type === 'success' ? (
                <Check className="h-5 w-5 mr-2" />
              ) : (
                <AlertCircle className="h-5 w-5 mr-2" />
              )}
              {message.text}
            </div>
          </div>
        )}

        {/* Leave Request Form */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8 mb-8">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Request Leave</h3>
            <p className="text-gray-600">
              Submit a leave request for approval.
            </p>
          </div>

          <form onSubmit={handleLeaveSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

            <button
              type="submit"
              disabled={loading === 'leave-submit' || !leaveData.date || !leaveData.reason.trim()}
              className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white font-medium py-3 px-4 rounded-lg hover:from-orange-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === 'leave-submit' ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Submitting...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Submit Leave Request
                </div>
              )}
            </button>
          </form>
        </div>

        {/* Leave Management Section */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-8">
          <div className="flex items-center mb-4">
            <div className="bg-gradient-to-r from-orange-500 to-red-600 p-3 rounded-lg mr-4">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {user.role === 'trainee' ? 'My Leave Requests' : 'Leave Management'}
              </h2>
              <p className="text-gray-600">
                {user.role === 'trainee' 
                  ? 'View, track, and manage your submitted leave requests'
                  : 'Review and manage team leave requests'
                }
              </p>
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                filter === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Requests
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                filter === 'pending'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                filter === 'approved'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Approved
            </button>
            {user.role === 'mentor' && (
              <button
                onClick={() => setFilter('my-requests')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  filter === 'my-requests'
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                My Requests
              </button>
            )}
          </div>
        </div>

        {/* Leave Requests List */}
        <div className="space-y-4">
          {filteredLeaves.length > 0 ? (
            filteredLeaves.map(leave => (
              <div key={leave.id} className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex-1 mb-4 lg:mb-0">
                    <div className="flex items-center mb-3">
                      <div className="flex items-center mr-4">
                        <User className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="font-semibold text-gray-900">
                          {getMemberName(leave.member_id)}
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
                      {getStatusIcon(leave.approved)}
                      <span className={`ml-2 text-sm font-medium ${getStatusColor(leave.approved)}`}>
                        {getStatusText(leave.approved)}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    {/* Cancel Button - Show for own requests that can be cancelled */}
                    {canCancelLeave(leave) && (
                      <div className="relative">
                        {showCancelConfirm === leave.id ? (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleCancel(leave.id)}
                              disabled={loading === `cancel-${leave.id}`}
                              className="inline-flex items-center px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {loading === `cancel-${leave.id}` ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                              ) : (
                                <CheckCircle className="h-3 w-3 mr-1" />
                              )}
                              Confirm
                            </button>
                            <button
                              onClick={() => setShowCancelConfirm(null)}
                              className="inline-flex items-center px-3 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-all duration-200"
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setShowCancelConfirm(leave.id)}
                            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Cancel Request
                          </button>
                        )}
                      </div>
                    )}

                    {/* Approve/Reject Buttons - Only show for mentors and pending requests */}
                    {user.role === 'mentor' && leave.approved === false && (
                      <>
                        <button
                          onClick={() => handleApprove(leave.id)}
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
                          onClick={() => handleReject(leave.id)}
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
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-12 text-center">
              <div className="text-gray-400 mb-4">
                <FileText className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No leave requests found
              </h3>
              <p className="text-gray-500">
                {filter === 'all' 
                  ? 'No leave requests have been submitted yet.'
                  : `No ${filter} leave requests found.`
                }
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default LeaveManagementPage;