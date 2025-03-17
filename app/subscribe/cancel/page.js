'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SubscriptionCancel() {
  const router = useRouter();
  
  // Always use light theme for subscription pages
  useEffect(() => {
    // Remove dark theme if it's applied
    document.documentElement.classList.remove('dark-theme');
  }, []);
  
  return (
    <div className="container">
      <div className="cancel-container" style={{ maxWidth: '600px', margin: '50px auto', padding: '30px', textAlign: 'center' }}>
        <img src="/AMAA.png" alt="AMAA Logo" style={{ width: '200px', marginBottom: '20px' }} />
        <h2>Subscription Cancelled</h2>
        <p>You have cancelled the subscription process.</p>
        <p>You can subscribe anytime to access premium features.</p>
        
        <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'center', gap: '20px' }}>
          <button 
            onClick={() => router.push('/subscribe')}
            style={{ 
              padding: '10px 20px', 
              background: '#0097b2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Try Again
          </button>
          
          <button 
            onClick={() => router.push('/')}
            style={{ 
              padding: '10px 20px', 
              background: '#f0f0f0',
              color: '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
} 