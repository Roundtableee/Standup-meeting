import React from 'react';
import { Check, Square, Plus, X } from 'lucide-react';
import { Task } from '../../types';

interface TaskListProps {
  tasks: Task[];
  onTaskToggle?: (taskId: string) => void;
  onTaskRemove?: (taskId: string) => void;
  onTaskAdd?: (text: string) => void;
  editable?: boolean;
  showAddTask?: boolean;
  className?: string;
}

const TaskList: React.FC<TaskListProps> = ({
  tasks,
  onTaskToggle,
  onTaskRemove,
  onTaskAdd,
  editable = false,
  showAddTask = false,
  className = '',
}) => {
  const [newTaskText, setNewTaskText] = React.useState('');

  const handleAddTask = () => {
    if (newTaskText.trim() && onTaskAdd) {
      onTaskAdd(newTaskText.trim());
      setNewTaskText('');
    }
  };

  const completedTasks = tasks.filter(task => task.completed).length;
  const totalTasks = tasks.length;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Progress Summary */}
      {totalTasks > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            Progress: <span className="font-medium text-gray-900">{completedTasks}/{totalTasks}</span>
          </span>
          <span className="text-gray-500">
            {Math.round((completedTasks / totalTasks) * 100)}% complete
          </span>
        </div>
      )}

      {/* Add New Task */}
      {showAddTask && (
        <div className="flex space-x-2 p-3 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <input
            type="text"
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            placeholder="Add a new task..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 text-sm"
            onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
          />
          <button
            onClick={handleAddTask}
            disabled={!newTaskText.trim()}
            className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Task List */}
      {tasks.length > 0 ? (
        <div className="space-y-2">
          {tasks.map((task, index) => (
            <div
              key={task.id}
              className={`flex items-center space-x-3 p-3 rounded-lg border transition-all duration-200 ${
                task.completed
                  ? 'bg-green-50 border-green-200'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              } ${editable && onTaskToggle ? 'cursor-pointer hover:shadow-sm' : ''}`}
              onClick={() => editable && onTaskToggle && onTaskToggle(task.id)}
            >
              {/* Checkbox */}
              <div className="flex-shrink-0">
                {task.completed ? (
                  <div className="w-5 h-5 bg-green-500 rounded border-2 border-green-500 flex items-center justify-center transition-colors duration-200">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                ) : (
                  <div className="w-5 h-5 border-2 border-gray-300 rounded hover:border-green-400 transition-colors duration-200">
                    <Square className="h-5 w-5 text-transparent" />
                  </div>
                )}
              </div>

              {/* Task Text */}
              <span
                className={`flex-1 text-sm leading-relaxed transition-all duration-200 ${
                  task.completed
                    ? 'text-green-800 font-medium'
                    : 'text-gray-800'
                }`}
              >
                {task.text}
              </span>

              {/* Task Number */}
              <span className="text-xs text-gray-400 font-medium">
                #{index + 1}
              </span>

              {/* Remove Button */}
              {editable && onTaskRemove && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTaskRemove(task.id);
                  }}
                  className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors duration-200 p-1 rounded"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <div className="text-gray-300 mb-2">
            <Square className="h-8 w-8 mx-auto" />
          </div>
          <p className="text-sm">No tasks yet</p>
          {showAddTask && (
            <p className="text-xs mt-1">Add your first task above</p>
          )}
        </div>
      )}

      {/* Completion Summary */}
      {totalTasks > 0 && completedTasks === totalTasks && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-center text-green-800">
            <Check className="h-5 w-5 mr-2" />
            <span className="font-medium">All tasks completed! 🎉</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskList;