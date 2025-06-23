import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Mail, Briefcase, Settings, UserPlus, AlertCircle, CheckCircle, Search, RefreshCw, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import Header from '../components/Layout/Header';
import { Member } from '../types';

interface ProfilePageProps {
  onBack: () => void;
  onLeaveManagement: () => void;
  onProfileClick?: () => void;
  onTeamClick?: (teamId: number) => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ onBack, onLeaveManagement, onProfileClick, onTeamClick }) => {
  const { user } = useAuth();
  const { 
    getMentorById, 
    assignMentor, 
    fetchMentors,
    refreshCurrentUser
  } = useApp();
  
  const [showMentorAssignment, setShowMentorAssignment] = useState(false);
  const [selectedMentorId, setSelectedMentorId] = useState<string>('');
  const [availableMentors, setAvailableMentors] = useState<Member[]>([]);
  const [mentorSearchTerm, setMentorSearchTerm] = useState('');
  const [fetchingMentors, setFetchingMentors] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Get current user's mentor
  const currentMentor = user?.mentor_id ? getMentorById(user.mentor_id) : null;

  // Fetch mentors when modal opens
  useEffect(() => {
    if (showMentorAssignment) {
      loadMentors();
    }
  }, [showMentorAssignment]);

  const loadMentors = async () => {
    setFetchingMentors(true);
    try {
      const mentors = await fetchMentors();
      setAvailableMentors(mentors);
      console.log('Loaded mentors for assignment:', mentors);
    } catch (error) {
      console.error('Error loading mentors:', error);
      setMessage({ type: 'error', text: 'Failed to load mentors' });
    } finally {
      setFetchingMentors(false);
    }
  };

  // Filter mentors based on search term
  const filteredMentors = availableMentors.filter(mentor =>
    mentor.name?.toLowerCase().includes(mentorSearchTerm.toLowerCase()) ||
    mentor.email?.toLowerCase().includes(mentorSearchTerm.toLowerCase()) ||
    mentor.id.toString().includes(mentorSearchTerm)
  );

  const handleAssignMentor = async () => {
    if (!selectedMentorId) {
      setMessage({ type: 'error', text: 'Please select a mentor first' });
      return;
    }
    
    setLoading('assign-mentor');
    setMessage(null);
    
    try {
      console.log('Assigning mentor ID:', selectedMentorId, 'to user:', user?.id);
      const result = await assignMentor(parseInt(selectedMentorId));
      
      if (result.success) {
        setShowMentorAssignment(false);
        setSelectedMentorId('');
        setMentorSearchTerm('');
        setMessage({ type: 'success', text: 'Mentor assigned successfully!' });
        
        // Refresh current user data to get updated mentor info
        await refreshCurrentUser();
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to assign mentor' });
      }
    } catch (error) {
      console.error('Error assigning mentor:', error);
      setMessage({ type: 'error', text: 'An error occurred while assigning mentor' });
    } finally {
      setLoading(null);
    }
  };

  const handleTeamClick = () => {
    if (user?.team_id && onTeamClick) {
      onTeamClick(user.team_id);
    }
  };

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
      <Header title="Profile & Settings" user={user} onProfileClick={onProfileClick}>
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-800 transition-colors duration-200"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Home
        </button>
      </Header>

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
                <CheckCircle className="h-5 w-5 mr-2" />
              ) : (
                <AlertCircle className="h-5 w-5 mr-2" />
              )}
              {message.text}
            </div>
          </div>
        )}

        {/* Profile Information */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8 mb-8">
          <div className="flex items-start space-x-6">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4 rounded-full">
              <User className="h-12 w-12 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center mb-3">
                <h2 className="text-2xl font-bold text-gray-900 mr-4">{user.name}</h2>
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  user.role === 'mentor' 
                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                    : 'bg-orange-100 text-orange-800 border border-orange-200'
                }`}>
                  <Briefcase className="h-4 w-4 mr-1" />
                  {user.role === 'mentor' ? 'Mentor' : 'Trainee'}
                </div>
              </div>
              <div className="space-y-2 text-gray-600">
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-2" />
                  {user.email}
                </div>
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  @{user.username}
                </div>
              </div>
            </div>
          </div>

          {/* Team Information */}
          {user.team && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Information</h3>
              <div 
                className="bg-gray-50 rounded-lg p-6 cursor-pointer hover:bg-gray-100 hover:shadow-md transition-all duration-200 group"
                onClick={handleTeamClick}
              >
                <div className="flex items-center mb-4">
                  <div className="bg-blue-500 p-3 rounded-lg mr-4 group-hover:bg-blue-600 transition-colors duration-200">
                    <Briefcase className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">{user.team.name}</h4>
                    <p className="text-gray-600">{user.team.description}</p>
                  </div>
                  <div className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <span className="text-sm font-medium">View Team →</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mentor Section */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">My Mentor</h3>
              {!currentMentor && (
                <button
                  onClick={() => setShowMentorAssignment(true)}
                  className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Mentor
                </button>
              )}
            </div>

            {currentMentor ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="bg-green-100 p-2 rounded-full mr-3">
                      <User className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-green-900">{currentMentor.name}</p>
                      <p className="text-sm text-green-700">{currentMentor.email}</p>
                      <p className="text-xs text-green-600">ID: {currentMentor.id}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowMentorAssignment(true)}
                    className="inline-flex items-center px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors duration-200"
                  >
                    <Settings className="h-3 w-3 mr-1" />
                    Change
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-amber-600 mr-2" />
                  <p className="text-amber-800 text-sm">
                    No mentor assigned. Click "Add Mentor" to assign one from the available mentors.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Leave Management Link */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={onLeaveManagement}
              className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white font-medium py-3 px-4 rounded-lg hover:from-orange-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <div className="flex items-center justify-center">
                <Calendar className="h-5 w-5 mr-2" />
                Manage Leave Requests
              </div>
            </button>
          </div>
        </div>

        {/* Mentor Assignment Modal */}
        {showMentorAssignment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4 max-h-[80vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Assign Mentor</h3>
                <button
                  onClick={loadMentors}
                  disabled={fetchingMentors}
                  className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 transition-colors duration-200 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${fetchingMentors ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
              
              {/* Search Input */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search mentors by name, email, or ID..."
                    value={mentorSearchTerm}
                    onChange={(e) => setMentorSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>

              {/* Selection Status */}
              {selectedMentorId && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-blue-600 mr-2" />
                    <span className="text-blue-800 text-sm font-medium">
                      Selected: {filteredMentors.find(m => m.id.toString() === selectedMentorId)?.name}
                    </span>
                  </div>
                </div>
              )}

              {/* Mentors List */}
              <div className="flex-1 overflow-y-auto mb-4">
                {fetchingMentors ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">Loading mentors...</span>
                  </div>
                ) : filteredMentors.length > 0 ? (
                  <div className="space-y-2">
                    {filteredMentors.map(mentor => (
                      <div
                        key={mentor.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                          selectedMentorId === mentor.id.toString()
                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedMentorId(mentor.id.toString())}
                      >
                        <div className="flex items-center">
                          <div className="bg-purple-100 p-2 rounded-full mr-3">
                            <User className="h-4 w-4 text-purple-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 text-sm">{mentor.name}</p>
                            <p className="text-xs text-gray-600">{mentor.email}</p>
                            <div className="flex items-center mt-1">
                              <span className="text-xs text-gray-500">ID: {mentor.id}</span>
                              {mentor.team && (
                                <span className="ml-2 text-xs text-blue-600">
                                  Team: {mentor.team.name}
                                </span>
                              )}
                            </div>
                          </div>
                          {selectedMentorId === mentor.id.toString() && (
                            <CheckCircle className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <User className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">
                      {mentorSearchTerm ? 'No mentors found matching your search' : 'No mentors available'}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowMentorAssignment(false);
                    setSelectedMentorId('');
                    setMentorSearchTerm('');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignMentor}
                  disabled={!selectedMentorId || loading === 'assign-mentor'}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading === 'assign-mentor' ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Assigning...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Assign Mentor
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ProfilePage;