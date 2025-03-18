'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useFirebaseAuth } from '../providers/FirebaseAuthProvider';
import { getTaskById } from '../utils/subscriptionQueue';

export default function FirebaseTestPage() {
  const { user, auth, db, loading, signIn, signOut } = useFirebaseAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginMessage, setLoginMessage] = useState('');
  const [premiumStatus, setPremiumStatus] = useState(null);
  const [queueTasks, setQueueTasks] = useState([]);
  const [taskId, setTaskId] = useState('');
  const [taskDetails, setTaskDetails] = useState(null);
  
  // Check premium status
  useEffect(() => {
    if (user) {
      checkPremiumStatus();
      loadQueueTasks();
    } else {
      setPremiumStatus(null);
      setQueueTasks([]);
    }
  }, [user]);
  
  // Load queue tasks from localStorage
  const loadQueueTasks = () => {
    try {
      const queueData = localStorage.getItem('subscriptionQueue');
      if (queueData) {
        const queue = JSON.parse(queueData);
        if (queue && queue.tasks) {
          setQueueTasks(Object.values(queue.tasks));
        }
      }
    } catch (error) {
      console.error('Error loading queue tasks:', error);
    }
  };
  
  // Check premium status
  const checkPremiumStatus = async () => {
    if (!user || !db) return;
    
    try {
      // Check Firestore
      const emailKey = user.email.toLowerCase().replace(/[.#$\/\[\]]/g, '_');
      const paidEmailDoc = await db.collection('paid_emails').doc(emailKey).get();
      const userDoc = await db.collection('users').doc(user.uid).get();
      
      setPremiumStatus({
        firebaseAuth: user.isPremium || false,
        firebaseAuthClaims: user.customClaims || {},
        firestore: userDoc.exists ? (userDoc.data()?.isPremium || false) : 'User doc not found',
        paidEmails: paidEmailDoc.exists ? paidEmailDoc.data() : 'Not in paid_emails collection',
      });
    } catch (error) {
      console.error('Error checking premium status:', error);
      setPremiumStatus({
        error: error.message,
      });
    }
  };
  
  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginMessage('');
    
    if (!email || !password) {
      setLoginMessage('Email and password are required');
      return;
    }
    
    try {
      await signIn(email, password);
      setLoginMessage('Login successful!');
    } catch (error) {
      console.error('Login error:', error);
      setLoginMessage(`Login failed: ${error.message}`);
    }
  };
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut();
      setLoginMessage('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      setLoginMessage(`Logout failed: ${error.message}`);
    }
  };
  
  // Handle checking a task
  const checkTask = () => {
    if (!taskId) return;
    
    try {
      const task = getTaskById(taskId);
      setTaskDetails(task || { error: 'Task not found' });
    } catch (error) {
      setTaskDetails({ error: error.message });
    }
  };
  
  // Test webhook
  const testWebhook = async () => {
    if (!user || !user.email) {
      setLoginMessage('You must be logged in to test webhooks');
      return;
    }
    
    try {
      const response = await fetch(`/api/test-webhook?email=${encodeURIComponent(user.email)}`);
      const data = await response.json();
      
      if (data.success) {
        setLoginMessage(`Webhook test successful: ${data.message}`);
      } else {
        setLoginMessage(`Webhook test failed: ${data.error || 'Unknown error'}`);
      }
      
      // Refresh premium status after a short delay
      setTimeout(checkPremiumStatus, 1000);
    } catch (error) {
      console.error('Webhook test error:', error);
      setLoginMessage(`Webhook test error: ${error.message}`);
    }
  };
  
  // Test manual premium status update
  const updatePremiumStatus = async (isPremium) => {
    if (!user || !user.email) {
      setLoginMessage('You must be logged in to update premium status');
      return;
    }
    
    try {
      const response = await fetch('/api/update-premium-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          isPremium,
          metadata: {
            source: 'firebase-test-page',
            timestamp: new Date().toISOString(),
          },
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setLoginMessage(`Premium status update successful: ${isPremium ? 'Premium' : 'Not Premium'}`);
      } else {
        setLoginMessage(`Premium status update failed: ${data.error || 'Unknown error'}`);
      }
      
      // Refresh premium status after a short delay
      setTimeout(checkPremiumStatus, 1000);
    } catch (error) {
      console.error('Premium status update error:', error);
      setLoginMessage(`Premium status update error: ${error.message}`);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Firebase Test Page</h1>
      
      <div className="mb-8 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-2xl font-semibold mb-4">Firebase Authentication</h2>
        
        {loading ? (
          <p>Loading authentication state...</p>
        ) : user ? (
          <div>
            <div className="mb-4 p-3 bg-green-100 rounded border border-green-300">
              <p><strong>Logged in as:</strong> {user.email}</p>
              <p><strong>User ID:</strong> {user.uid}</p>
              <p><strong>Email verified:</strong> {user.emailVerified ? 'Yes' : 'No'}</p>
            </div>
            
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
            >
              Logout
            </button>
            
            <button
              onClick={checkPremiumStatus}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded ml-3"
            >
              Refresh Premium Status
            </button>
            
            <button
              onClick={testWebhook}
              className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded ml-3"
            >
              Test Webhook
            </button>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block mb-1">Email:</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block mb-1">Password:</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>
            
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              Login
            </button>
          </form>
        )}
        
        {loginMessage && (
          <div className={`mt-4 p-3 rounded ${loginMessage.includes('failed') || loginMessage.includes('error') ? 'bg-red-100 border border-red-300' : 'bg-green-100 border border-green-300'}`}>
            {loginMessage}
          </div>
        )}
      </div>
      
      {user && premiumStatus && (
        <div className="mb-8 p-4 bg-gray-100 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">Premium Status</h2>
          
          <div className="space-y-4">
            <div className="bg-white p-3 rounded border">
              <h3 className="font-semibold">Firebase Auth Claims:</h3>
              <pre className="mt-2 bg-gray-100 p-2 rounded overflow-x-auto">
                {JSON.stringify(premiumStatus.firebaseAuthClaims, null, 2)}
              </pre>
            </div>
            
            <div className="bg-white p-3 rounded border">
              <h3 className="font-semibold">Firestore User Document:</h3>
              <pre className="mt-2 bg-gray-100 p-2 rounded overflow-x-auto">
                {JSON.stringify(premiumStatus.firestore, null, 2)}
              </pre>
            </div>
            
            <div className="bg-white p-3 rounded border">
              <h3 className="font-semibold">Paid Emails Collection:</h3>
              <pre className="mt-2 bg-gray-100 p-2 rounded overflow-x-auto">
                {JSON.stringify(premiumStatus.paidEmails, null, 2)}
              </pre>
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={() => updatePremiumStatus(true)}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
              >
                Mark as Premium
              </button>
              
              <button
                onClick={() => updatePremiumStatus(false)}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded"
              >
                Remove Premium
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="mb-8 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-2xl font-semibold mb-4">Queue Tasks</h2>
        
        <div className="mb-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              placeholder="Task ID"
              className="flex-1 px-3 py-2 border rounded"
            />
            
            <button
              onClick={checkTask}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              Check Task
            </button>
            
            <button
              onClick={loadQueueTasks}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
            >
              Refresh Tasks
            </button>
          </div>
          
          {taskDetails && (
            <div className="mt-3 bg-white p-3 rounded border">
              <h3 className="font-semibold">Task Details:</h3>
              <pre className="mt-2 bg-gray-100 p-2 rounded overflow-x-auto">
                {JSON.stringify(taskDetails, null, 2)}
              </pre>
            </div>
          )}
        </div>
        
        <div>
          <h3 className="font-semibold mb-2">All Queue Tasks:</h3>
          
          {queueTasks.length === 0 ? (
            <p>No tasks in queue</p>
          ) : (
            <div className="space-y-3">
              {queueTasks.map((task) => (
                <div key={task.id} className="bg-white p-3 rounded border">
                  <p>
                    <strong>ID:</strong> {task.id} |{' '}
                    <strong>Type:</strong> {task.type} |{' '}
                    <strong>Status:</strong>{' '}
                    <span className={`font-semibold ${
                      task.status === 'completed' ? 'text-green-600' : 
                      task.status === 'failed' ? 'text-red-600' : 
                      task.status === 'processing' ? 'text-yellow-600' : 
                      'text-blue-600'
                    }`}>
                      {task.status}
                    </span>
                  </p>
                  <details>
                    <summary className="cursor-pointer text-blue-500 hover:text-blue-700">
                      View Details
                    </summary>
                    <pre className="mt-2 bg-gray-100 p-2 rounded overflow-x-auto">
                      {JSON.stringify(task, null, 2)}
                    </pre>
                  </details>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div className="text-center mt-8">
        <Link href="/" className="text-blue-500 hover:text-blue-700">
          ← Back to Home
        </Link>
      </div>
    </div>
  );
} 