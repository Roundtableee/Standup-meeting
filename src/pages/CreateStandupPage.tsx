import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, AlertCircle, Edit, Plus, X, Check, Calendar } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Layout/Header';
import { Task } from '../types';

interface CreateStandupPageProps {
  onBack: () => void;
  onSuccess: () => void;
  onProfileClick?: () => void;
}

const CreateStandupPage: React.FC<CreateStandupPageProps> = ({ onBack, onSuccess, onProfileClick }) => {
  const { user } = useAuth();
  const { teams, members, createStandup, getTodaysStandupByMember, shouldSkipStandup, getUserLeaveStatus } = useApp();
  const [formData, setFormData] = useState({
    teamId: '',
    memberId: '',
    tasks: [] as Task[],
    blockers: '',
  });
  const [newTaskText, setNewTaskText] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskText, setEditingTaskText] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingStandup, setExistingStandup] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Auto-populate team and member if current user is a team member
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        teamId: user.team_id?.toString() || '',
        memberId: user.id.toString(),
      }));

      // Check if user already has a standup today
      const todaysStandup = getTodaysStandupByMember(user.id);
      if (todaysStandup) {
        setExistingStandup(todaysStandup);
        setIsEditing(true);
        
        // Convert existing standup data to form format
        const existingTasks: Task[] = [];
        const content = todaysStandup.content || [];
        const contentStat = todaysStandup.content_stat || [];
        let blockers = '';

        content.forEach((item: string, index: number) => {
          if (item.toLowerCase().includes('blocker') || item.toLowerCase().includes('challenge')) {
            blockers = item.replace(/^blockers?:\s*/i, '').trim();
          } else {
            existingTasks.push({
              id: `task-${index}`,
              text: item.trim(),
              completed: contentStat[index] || false
            });
          }
        });

        setFormData(prev => ({
          ...prev,
          tasks: existingTasks,
          blockers: blockers,
        }));
      }
    }
  }, [user, getTodaysStandupByMember]);

  // Check if user should skip standup today
  const skipStandupToday = user ? shouldSkipStandup(user.id) : false;
  const leaveStatus = user ? getUserLeaveStatus(user.id) : { onLeave: false };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.teamId) newErrors.teamId = 'Please select a team';
    if (!formData.memberId) newErrors.memberId = 'Please select a team member';
    if (formData.tasks.length === 0) newErrors.tasks = 'Please add at least one task';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    
    try {
      // Convert tasks to content array format for database
      const content = formData.tasks.map(task => task.text);
      if (formData.blockers.trim()) {
        content.push(`Blockers: ${formData.blockers.trim()}`);
      }

      const result = await createStandup(content);

      if (result.success) {
        onSuccess();
      } else {
        setErrors({ general: result.error || 'Failed to save standup' });
      }
    } catch (error) {
      console.error('Failed to save standup:', error);
      setErrors({ general: 'An unexpected error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const addTask = () => {
    if (newTaskText.trim()) {
      const newTask: Task = {
        id: Date.now().toString(),
        text: newTaskText.trim(),
        completed: false,
      };
      setFormData(prev => ({
        ...prev,
        tasks: [...prev.tasks, newTask],
      }));
      setNewTaskText('');
      
      // Clear tasks error if it exists
      if (errors.tasks) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.tasks;
          return newErrors;
        });
      }
    }
  };

  const removeTask = (taskId: string) => {
    setFormData(prev => ({
      ...prev,
      tasks: prev.tasks.filter(task => task.id !== taskId),
    }));
  };

  const toggleTaskCompletion = (taskId: string) => {
    setFormData(prev => ({
      ...prev,
      tasks: prev.tasks.map(task =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      ),
    }));
  };

  const startEditingTask = (taskId: string, currentText: string) => {
    setEditingTaskId(taskId);
    setEditingTaskText(currentText);
  };

  const saveTaskEdit = (taskId: string) => {
    if (editingTaskText.trim()) {
      setFormData(prev => ({
        ...prev,
        tasks: prev.tasks.map(task =>
          task.id === taskId ? { ...task, text: editingTaskText.trim() } : task
        ),
      }));
    }
    setEditingTaskId(null);
    setEditingTaskText('');
  };

  const cancelTaskEdit = () => {
    setEditingTaskId(null);
    setEditingTaskText('');
  };

  const handleTaskEditKeyDown = (e: React.KeyboardEvent, taskId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveTaskEdit(taskId);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelTaskEdit();
    }
  };

  const filteredMembers = formData.teamId 
    ? members.filter(member => member.team_id === parseInt(formData.teamId))
    : [];

  const isCurrentUserMember = user?.team_id !== undefined;
  const selectedMember = members.find(m => m.id === parseInt(formData.memberId));

  // If user is on leave today, show leave notice
  if (skipStandupToday) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        <Header 
          title="Daily Standup" 
          user={user}
          onProfileClick={onProfileClick}
          onBack={onBack}
          showBackButton={true}
        />

        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8 text-center">
            <div className="mb-6">
              <div className="bg-green-100 p-4 rounded-full inline-block mb-4">
                <Calendar className="h-12 w-12 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                You're on Leave Today
              </h2>
              <p className="text-gray-600 mb-4">
                No daily standup is required while you're on approved leave.
              </p>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-center mb-2">
                  <Check className="h-5 w-5 text-green-600 mr-2" />
                  <span className="font-medium text-green-800">Leave Status: Approved</span>
                </div>
                <div className="text-sm text-green-700 space-y-1">
                  <p><strong>Type:</strong> {leaveStatus.leaveType?.charAt(0).toUpperCase()}{leaveStatus.leaveType?.slice(1)}</p>
                  <p><strong>Reason:</strong> {leaveStatus.reason}</p>
                </div>
              </div>
            </div>

            <button
              onClick={onBack}
              className="inline-flex items-center px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors duration-200"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <Header 
        title={isEditing ? "Edit Daily Standup" : "Create Daily Standup"} 
        user={user}
        onProfileClick={onProfileClick}
        onBack={onBack}
        showBackButton={true}
      />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {isEditing ? "Edit Your Daily Standup" : "Create New Daily Standup"}
            </h2>
            <p className="text-gray-600">
              {isEditing 
                ? "Update your tasks and blockers for today."
                : "Add your tasks and any blockers for today."
              }
            </p>
            {isEditing && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center">
                  <Edit className="h-4 w-4 text-blue-600 mr-2" />
                  <span className="text-blue-800 text-sm font-medium">
                    You're editing today's standup
                  </span>
                </div>
              </div>
            )}
          </div>

          {errors.general && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                <span className="text-red-800 text-sm">{errors.general}</span>
              </div>
            </div>
          )}

          {!isCurrentUserMember && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-amber-600 mr-2" />
                <p className="text-amber-800 text-sm">
                  You're not currently assigned to a team. Please contact your administrator or 
                  <button 
                    onClick={onProfileClick}
                    className="text-amber-900 underline hover:text-amber-700 ml-1"
                  >
                    update your profile
                  </button>
                  .
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="teamId" className="block text-sm font-medium text-gray-700 mb-2">
                  Team
                </label>
                <select
                  id="teamId"
                  value={formData.teamId}
                  onChange={(e) => handleInputChange('teamId', e.target.value)}
                  disabled={isCurrentUserMember}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
                    errors.teamId ? 'border-red-300' : 'border-gray-300'
                  } ${isCurrentUserMember ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                >
                  <option value="">Select a team</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
                {isCurrentUserMember && (
                  <p className="mt-1 text-xs text-gray-500">
                    Auto-selected based on your team membership
                  </p>
                )}
                {errors.teamId && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.teamId}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="memberId" className="block text-sm font-medium text-gray-700 mb-2">
                  Team Member
                </label>
                <select
                  id="memberId"
                  value={formData.memberId}
                  onChange={(e) => handleInputChange('memberId', e.target.value)}
                  disabled={!formData.teamId || isCurrentUserMember}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
                    errors.memberId ? 'border-red-300' : 'border-gray-300'
                  } ${(!formData.teamId || isCurrentUserMember) ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                >
                  <option value="">Select a team member</option>
                  {filteredMembers.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.name} - {member.role}
                    </option>
                  ))}
                </select>
                {isCurrentUserMember && selectedMember && (
                  <p className="mt-1 text-xs text-gray-500">
                    Creating standup as {selectedMember.name}
                  </p>
                )}
                {errors.memberId && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.memberId}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Today's Tasks
              </label>
              
              {/* Add new task */}
              <div className="flex space-x-2 mb-4">
                <input
                  type="text"
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  placeholder="Add a task for today..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTask())}
                />
                <button
                  type="button"
                  onClick={addTask}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Tasks list */}
              {formData.tasks.length > 0 && (
                <div className="space-y-2 mb-4">
                  {formData.tasks.map(task => (
                    <div 
                      key={task.id} 
                      className={`flex items-center space-x-3 p-3 rounded-lg border transition-all duration-200 ${
                        task.completed
                          ? 'bg-green-50 border-green-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleTaskCompletion(task.id)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                          task.completed 
                            ? 'bg-green-500 border-green-500 text-white shadow-sm' 
                            : 'border-gray-300 hover:border-green-400 hover:bg-green-50'
                        }`}
                      >
                        {task.completed && <Check className="h-3 w-3" />}
                      </button>
                      
                      {editingTaskId === task.id ? (
                        <div className="flex-1 flex items-center space-x-2">
                          <input
                            type="text"
                            value={editingTaskText}
                            onChange={(e) => setEditingTaskText(e.target.value)}
                            className="flex-1 px-2 py-1 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            onKeyDown={(e) => handleTaskEditKeyDown(e, task.id)}
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => saveTaskEdit(task.id)}
                            className="text-green-600 hover:text-green-700 transition-colors duration-200 p-1 rounded"
                            title="Save (Enter)"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={cancelTaskEdit}
                            className="text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1 rounded"
                            title="Cancel (Escape)"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span 
                            className={`flex-1 text-sm transition-all duration-200 cursor-pointer hover:text-blue-600 ${
                              task.completed 
                                ? 'text-green-800 font-medium' 
                                : 'text-gray-700'
                            }`}
                            onClick={() => startEditingTask(task.id, task.text)}
                            title="Click to edit"
                          >
                            {task.text}
                          </span>
                          <button
                            type="button"
                            onClick={() => startEditingTask(task.id, task.text)}
                            className="text-gray-400 hover:text-blue-500 transition-colors duration-200 p-1 rounded"
                            title="Edit task"
                          >
                            <Edit className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeTask(task.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors duration-200 p-1 rounded"
                            title="Remove task"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {errors.tasks && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.tasks}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="blockers" className="block text-sm font-medium text-gray-700 mb-2">
                Any blockers or challenges? (Optional)
              </label>
              <textarea
                id="blockers"
                rows={3}
                value={formData.blockers}
                onChange={(e) => handleInputChange('blockers', e.target.value)}
                placeholder="Describe any blockers or challenges you're facing..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 resize-none"
              />
            </div>

            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onBack}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {isEditing ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {isEditing ? 'Update Standup' : 'Create Standup'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default CreateStandupPage;