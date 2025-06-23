import React, { useState } from 'react';
import TaskList from './TaskList';
import { Task } from '../../types';

const TaskDemo: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', text: 'Complete project documentation', completed: true },
    { id: '2', text: 'Review pull requests from team members', completed: false },
    { id: '3', text: 'Update design system components', completed: true },
    { id: '4', text: 'Fix accessibility issues in navigation', completed: false },
    { id: '5', text: 'Implement user authentication flow', completed: true },
    { id: '6', text: 'Set up automated testing pipeline', completed: false },
    { id: '7', text: 'Optimize database queries for performance', completed: true },
    { id: '8', text: 'Create API documentation', completed: false },
  ]);

  const handleTaskToggle = (taskId: string) => {
    setTasks(prev => prev.map(task =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  };

  const handleTaskRemove = (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
  };

  const handleTaskAdd = (text: string) => {
    const newTask: Task = {
      id: Date.now().toString(),
      text,
      completed: false,
    };
    setTasks(prev => [...prev, newTask]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Task List Demo
            </h1>
            <p className="text-gray-600">
              Interactive task list with green highlighting for completed items.
              Completed tasks remain visible and clearly marked as done.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Editable Task List */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Editable Task List
              </h2>
              <div className="bg-gray-50 rounded-lg p-6">
                <TaskList
                  tasks={tasks}
                  onTaskToggle={handleTaskToggle}
                  onTaskRemove={handleTaskRemove}
                  onTaskAdd={handleTaskAdd}
                  editable={true}
                  showAddTask={true}
                />
              </div>
            </div>

            {/* Read-only Task List */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Read-only Task List
              </h2>
              <div className="bg-gray-50 rounded-lg p-6">
                <TaskList
                  tasks={tasks}
                  editable={false}
                  showAddTask={false}
                />
              </div>
            </div>
          </div>

          {/* Features List */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Key Features
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex items-center text-green-600">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Completed tasks highlighted in green
                </div>
                <div className="flex items-center text-green-600">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Text remains fully readable
                </div>
                <div className="flex items-center text-green-600">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Completed items stay in original position
                </div>
                <div className="flex items-center text-green-600">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Visual progress indicators
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center text-blue-600">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  Click to toggle completion
                </div>
                <div className="flex items-center text-blue-600">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  Add new tasks inline
                </div>
                <div className="flex items-center text-blue-600">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  Remove tasks with X button
                </div>
                <div className="flex items-center text-blue-600">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  Completion celebration
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDemo;