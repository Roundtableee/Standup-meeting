import React, { useState } from 'react';
import { ArrowLeft, Search, Users, Brain, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import Header from '../components/Layout/Header';

interface AIMatchResult {
  id: number;
  name: string;
  reason: string;
  skills: string[];
  description: string;
}

interface AIEmployeeMatcherPageProps {
  onBack: () => void;
  onProfileClick?: () => void;
}

const AIEmployeeMatcherPage: React.FC<AIEmployeeMatcherPageProps> = ({ onBack, onProfileClick }) => {
  const { user } = useAuth();
  const { members } = useApp();
  
  const [taskDescription, setTaskDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AIMatchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const handleFindBestMatch = async () => {
    if (!taskDescription.trim()) {
      setError('Please enter a task description');
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);
    setDebugInfo(null);

    try {
      // Prepare members data for the AI request
      const membersData = members.map(member => ({
        id: member.id,
        name: member.name,
        skills: member.skills || [],
        description: member.description || ''
      }));

      const requestBody = {
        task: taskDescription.trim(),
        members: membersData
      };

      console.log('Sending request to AI matcher:', requestBody);

      // Send request to n8n webhook
      const response = await fetch('https://thossathamoutlook.app.n8n.cloud/webhook/ai-employee-matcher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('AI matcher response:', data);
      
      // Store debug info for display
      setDebugInfo({
        received: data,
        type: typeof data,
        isArray: Array.isArray(data),
        keys: typeof data === 'object' && data !== null ? Object.keys(data) : [],
        structure: JSON.stringify(data, null, 2)
      });

      let employees: AIMatchResult[] = [];

      // Try multiple parsing strategies
      if (Array.isArray(data) && data.length > 0) {
        // Strategy 1: Direct array of employees
        if (data[0].id && data[0].name) {
          employees = data;
          console.log('✓ Parsed as direct array of employees');
        }
        // Strategy 2: Array with employees nested in first element
        else if (data[0].employees && Array.isArray(data[0].employees)) {
          employees = data[0].employees;
          console.log('✓ Parsed from data[0].employees');
        }
        // Strategy 3: Array with employees nested under json key
        else if (data[0].json && data[0].json.employees && Array.isArray(data[0].json.employees)) {
          employees = data[0].json.employees;
          console.log('✓ Parsed from data[0].json.employees');
        }
        // Strategy 4: Array with employees nested under data key
        else if (data[0].data && data[0].data.employees && Array.isArray(data[0].data.employees)) {
          employees = data[0].data.employees;
          console.log('✓ Parsed from data[0].data.employees');
        }
        // Strategy 5: Check if first element is the employee data directly
        else if (data[0].json && Array.isArray(data[0].json)) {
          employees = data[0].json;
          console.log('✓ Parsed from data[0].json as array');
        }
      } 
      // Strategy 6: Object with employees key
      else if (data.employees && Array.isArray(data.employees)) {
        employees = data.employees;
        console.log('✓ Parsed from data.employees');
      }
      // Strategy 7: Object with json.employees key
      else if (data.json && data.json.employees && Array.isArray(data.json.employees)) {
        employees = data.json.employees;
        console.log('✓ Parsed from data.json.employees');
      }
      // Strategy 8: Object with data.employees key
      else if (data.data && data.data.employees && Array.isArray(data.data.employees)) {
        employees = data.data.employees;
        console.log('✓ Parsed from data.data.employees');
      }

      if (employees.length > 0) {
        setResults(employees);
        setHasSearched(true);
        console.log('✓ Successfully parsed employees:', employees);
      } else {
        console.error('❌ Could not find employees in response structure');
        throw new Error('No employee data found in response. Check the debug information below.');
      }

    } catch (error) {
      console.error('Error calling AI matcher:', error);
      setError(error instanceof Error ? error.message : 'Failed to get AI recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleFindBestMatch();
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
        title="AI Employee Matcher" 
        user={user} 
        onProfileClick={onProfileClick}
        onBack={onBack}
        showBackButton={true}
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8 mb-8">
          <div className="flex items-center mb-6">
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-3 rounded-lg mr-4">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">AI Employee Matcher</h2>
              <p className="text-gray-600">Find the best team members for your tasks using AI recommendations</p>
            </div>
          </div>

          {/* Task Input Section */}
          <div className="space-y-4">
            <div>
              <label htmlFor="task-description" className="block text-sm font-medium text-gray-700 mb-2">
                Task Description
              </label>
              <textarea
                id="task-description"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Describe the task you need help with. Include required skills, complexity level, and any specific requirements..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors duration-200 resize-none"
                rows={4}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                  <span className="text-red-800 text-sm">{error}</span>
                </div>
              </div>
            )}

            <button
              onClick={handleFindBestMatch}
              disabled={loading || !taskDescription.trim()}
              className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-medium py-3 px-6 rounded-lg hover:from-purple-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <Loader className="animate-spin h-5 w-5 mr-2" />
                  Finding Best Match...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <Search className="h-5 w-5 mr-2" />
                  Find Best Match
                </div>
              )}
            </button>
          </div>
        </div>

        {/* 
        {debugInfo && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-yellow-800 mb-4">Debug Information</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-yellow-700 mb-2">What the website received:</h4>
                <div className="bg-white border border-yellow-300 rounded p-3 text-sm">
                  <p><strong>Type:</strong> {debugInfo.type}</p>
                  <p><strong>Is Array:</strong> {debugInfo.isArray ? 'Yes' : 'No'}</p>
                  <p><strong>Keys:</strong> {debugInfo.keys.join(', ') || 'None'}</p>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-yellow-700 mb-2">Full Response Structure:</h4>
                <pre className="bg-white border border-yellow-300 rounded p-3 text-xs overflow-x-auto max-h-64">
                  {debugInfo.structure}
                </pre>
              </div>
              <div>
                <h4 className="font-medium text-yellow-700 mb-2">What the website expects:</h4>
                <div className="bg-white border border-yellow-300 rounded p-3 text-sm">
                  <p>The website tries to parse the response in this order:</p>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Direct array of employees: <code>[{`{id, name, reason, skills, description}`}]</code></li>
                    <li>Array with employees in first element: <code>[{`{employees: [...]}`}]</code></li>
                    <li>Array with employees under json key: <code>[{`{json: {employees: [...]}}`}]</code></li>
                    <li>Array with employees under data key: <code>[{`{data: {employees: [...]}}`}]</code></li>
                    <li>Array with json as direct array: <code>[{`{json: [...]}`}]</code></li>
                    <li>Object with employees key: <code>{`{employees: [...]}`}</code></li>
                    <li>Object with json.employees: <code>{`{json: {employees: [...]}}`}</code></li>
                    <li>Object with data.employees: <code>{`{data: {employees: [...]}}`}</code></li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}
        */}

        {/* Results Section */}
        {hasSearched && (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center mb-6">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-3 rounded-lg mr-4">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">AI Recommendations</h3>
                <p className="text-gray-600">
                  {results.length > 0 
                    ? `Found ${results.length} recommended team member${results.length !== 1 ? 's' : ''} for your task`
                    : 'No recommendations found for this task'
                  }
                </p>
              </div>
            </div>

            {results.length > 0 ? (
              <div className="space-y-4">
                {results.map((result, index) => (
                  <div key={result.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-200">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center">
                        <div className="bg-blue-100 p-2 rounded-full mr-3">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">{result.name}</h4>
                          <div className="flex items-center mt-1">
                            <span className="text-sm text-gray-500 mr-2">Rank #{index + 1}</span>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* AI Reason */}
                    <div className="mb-4">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">AI Recommendation Reason:</h5>
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                        <p className="text-purple-800 text-sm leading-relaxed">{result.reason}</p>
                      </div>
                    </div>

                    {/* Skills */}
                    {result.skills && result.skills.length > 0 && (
                      <div className="mb-4">
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Skills:</h5>
                        <div className="flex flex-wrap gap-2">
                          {result.skills.map((skill, skillIndex) => (
                            <span
                              key={skillIndex}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Description */}
                    {result.description && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-2">About:</h5>
                        <p className="text-gray-600 text-sm leading-relaxed">{result.description}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <Search className="h-12 w-12 mx-auto" />
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">No Matches Found</h4>
                <p className="text-gray-500">
                  The AI couldn't find suitable team members for this task. Try refining your task description or check if team members have updated their skills and descriptions.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Info Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start">
            <Brain className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-900 mb-2">How AI Employee Matching Works</h4>
              <ul className="text-blue-800 text-sm space-y-1">
                <li>• AI analyzes your task description and requirements</li>
                <li>• Compares against team members' skills and experience descriptions</li>
                <li>• Ranks candidates based on skill relevance and experience match</li>
                <li>• Provides detailed reasoning for each recommendation</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AIEmployeeMatcherPage;