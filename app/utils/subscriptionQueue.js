/**
 * Subscription Processing Queue System
 * 
 * This utility provides a resilient queue for handling subscription-related operations,
 * ensuring they can be retried and tracked even when there are temporary failures.
 */

// In-memory queue as a simple solution (in production you might want to use Redis or similar)
const QUEUE = {
  tasks: [],
  processing: false,
  failures: {},
  MAX_RETRIES: 5
};

// Check if localStorage is available (client-side only)
const hasLocalStorage = typeof window !== 'undefined' && window.localStorage;

/**
 * Load persisted tasks from localStorage
 */
export function loadPersistedTasks() {
  if (!hasLocalStorage) return;
  
  try {
    const savedTasks = localStorage.getItem('subscriptionQueueTasks');
    
    if (savedTasks) {
      const tasks = JSON.parse(savedTasks);
      if (Array.isArray(tasks)) {
        console.log(`Loaded ${tasks.length} persisted subscription tasks`);
        
        // Add each task back to the queue
        tasks.forEach(task => {
          if (!QUEUE.tasks.some(t => t.id === task.id)) {
            QUEUE.tasks.push(task);
          }
        });
        
        // Start processing if needed
        processQueue();
      }
    }
  } catch (error) {
    console.error('Error loading persisted subscription tasks:', error);
  }
}

/**
 * Save tasks to localStorage for persistence
 */
function persistTasks() {
  if (!hasLocalStorage) return;
  
  try {
    localStorage.setItem('subscriptionQueueTasks', JSON.stringify(QUEUE.tasks));
  } catch (error) {
    console.error('Error persisting subscription tasks:', error);
  }
}

/**
 * Generate unique ID for queue tasks
 */
function generateTaskId() {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Add a subscription verification task to the queue
 * @param {string} sessionId - Stripe session ID
 * @param {string} email - User email
 * @param {Object} metadata - Any additional metadata
 * @returns {string} Task ID
 */
export function enqueueSubscriptionVerification(sessionId, email, metadata = {}) {
  if (!sessionId || !email) {
    console.error('Session ID and email are required for subscription verification');
    return null;
  }
  
  const taskId = generateTaskId();
  
  const task = {
    id: taskId,
    type: 'verify_subscription',
    data: {
      sessionId,
      email: email.toLowerCase(),
      metadata,
      createdAt: new Date().toISOString()
    },
    retries: 0,
    status: 'pending'
  };
  
  QUEUE.tasks.push(task);
  console.log(`Enqueued subscription verification task: ${taskId} for ${email}`);
  
  // Persist tasks after adding
  persistTasks();
  
  // Start processing if not already running
  processQueue();
  
  return taskId;
}

/**
 * Add a premium status update task to the queue
 * @param {string} email - User email 
 * @param {boolean} isPremium - Premium status to set
 * @param {Object} metadata - Any additional metadata
 * @returns {string} Task ID
 */
export function enqueuePremiumStatusUpdate(email, isPremium = true, metadata = {}) {
  if (!email) {
    console.error('Email is required for premium status update');
    return null;
  }
  
  const taskId = generateTaskId();
  
  const task = {
    id: taskId,
    type: 'update_premium_status',
    data: {
      email: email.toLowerCase(),
      isPremium,
      metadata,
      createdAt: new Date().toISOString()
    },
    retries: 0,
    status: 'pending'
  };
  
  QUEUE.tasks.push(task);
  console.log(`Enqueued premium status update task: ${taskId} for ${email} (premium: ${isPremium})`);
  
  // Persist tasks after adding
  persistTasks();
  
  // Start processing if not already running
  processQueue();
  
  return taskId;
}

/**
 * Get task by ID
 * @param {string} taskId - Task ID to look up
 * @returns {Object|null} Task object or null if not found
 */
export function getTaskById(taskId) {
  return QUEUE.tasks.find(task => task.id === taskId) || null;
}

/**
 * Process all tasks in the queue
 */
export async function processQueue() {
  // Avoid concurrent processing
  if (QUEUE.processing) return;
  
  // No tasks to process
  if (QUEUE.tasks.length === 0) return;
  
  try {
    // Mark as processing
    QUEUE.processing = true;
    
    console.log(`Processing subscription queue (${QUEUE.tasks.length} tasks)...`);
    
    // Get pending tasks
    const pendingTasks = QUEUE.tasks.filter(task => 
      task.status === 'pending' || 
      (task.status === 'failed' && task.retries < QUEUE.MAX_RETRIES)
    );
    
    // Process each task sequentially
    for (const task of pendingTasks) {
      try {
        // Skip if task is now complete (another process might have handled it)
        if (task.status === 'completed') continue;
        
        // Update status to processing
        task.status = 'processing';
        task.startedAt = new Date().toISOString();
        
        // Process based on task type
        if (task.type === 'verify_subscription') {
          await processSubscriptionVerification(task);
        } else if (task.type === 'update_premium_status') {
          await processPremiumStatusUpdate(task);
        } else {
          console.error(`Unknown task type: ${task.type}`);
          task.status = 'failed';
          task.error = 'Unknown task type';
        }
        
        // Persist changes after each task
        persistTasks();
      } catch (taskError) {
        console.error(`Error processing task ${task.id}:`, taskError);
        
        // Update task status
        task.status = 'failed';
        task.retries = (task.retries || 0) + 1;
        task.lastError = taskError.message;
        task.lastErrorAt = new Date().toISOString();
        
        // Track failures by type for debugging
        const errorType = taskError.name || 'UnknownError';
        QUEUE.failures[errorType] = (QUEUE.failures[errorType] || 0) + 1;
        
        // If max retries reached, mark as failed permanently
        if (task.retries >= QUEUE.MAX_RETRIES) {
          task.status = 'failed_permanent';
          console.error(`Task ${task.id} permanently failed after ${task.retries} retries`);
        }
        
        // Persist changes after error
        persistTasks();
      }
    }
    
    // Clean up completed tasks older than 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    QUEUE.tasks = QUEUE.tasks.filter(task => 
      task.status !== 'completed' || 
      !task.completedAt || 
      task.completedAt > oneHourAgo
    );
    
    // Persist after cleanup
    persistTasks();
    
    console.log(`Queue processing completed. Remaining tasks: ${QUEUE.tasks.length}`);
  } catch (error) {
    console.error('Error in queue processing:', error);
  } finally {
    // Mark as not processing
    QUEUE.processing = false;
    
    // Check if we need to process more tasks
    const pendingCount = QUEUE.tasks.filter(t => 
      t.status === 'pending' || 
      (t.status === 'failed' && t.retries < QUEUE.MAX_RETRIES)
    ).length;
    
    if (pendingCount > 0) {
      // Schedule next batch with a small delay
      setTimeout(() => processQueue(), 1000);
    }
  }
}

/**
 * Process a subscription verification task
 * @param {Object} task - Task object
 */
async function processSubscriptionVerification(task) {
  console.log(`Processing subscription verification for ${task.data.email}`);
  
  try {
    // Call API to verify subscription
    const response = await fetch('/api/verify-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        sessionId: task.data.sessionId,
        email: task.data.email
      }),
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      // Task completed successfully
      task.status = 'completed';
      task.completedAt = new Date().toISOString();
      task.result = result;
      
      console.log(`Subscription verification completed for ${task.data.email}`);
    } else {
      // Task failed
      throw new Error(result.error || 'Verification failed');
    }
  } catch (error) {
    console.error(`Error verifying subscription for ${task.data.email}:`, error);
    throw error; // Re-throw to handle in the main processing function
  }
}

/**
 * Process a premium status update task
 * @param {Object} task - Task object
 */
async function processPremiumStatusUpdate(task) {
  console.log(`Processing premium status update for ${task.data.email} (premium: ${task.data.isPremium})`);
  
  try {
    // Call API to update premium status
    const response = await fetch('/api/update-premium-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: task.data.email,
        isPremium: task.data.isPremium,
        metadata: task.data.metadata
      }),
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      // Task completed successfully
      task.status = 'completed';
      task.completedAt = new Date().toISOString();
      task.result = result;
      
      console.log(`Premium status update completed for ${task.data.email}`);
    } else {
      // Task failed
      throw new Error(result.error || 'Status update failed');
    }
  } catch (error) {
    console.error(`Error updating premium status for ${task.data.email}:`, error);
    throw error; // Re-throw to handle in the main processing function
  }
}

// Start processing queue on load
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    loadPersistedTasks();
  });
}

// Export queue for debugging (development only)
if (process.env.NODE_ENV === 'development') {
  if (typeof window !== 'undefined') {
    window.__SUBSCRIPTION_QUEUE = QUEUE;
  }
} 