'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

// Create a component that uses searchParams
function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  
  return (
    <div className="auth-container">
      <h1>Authentication Error</h1>
      <div className="auth-card">
        <p>An error occurred during authentication: {error || 'Unknown error'}</p>
        <a href="/" className="auth-button">Return Home</a>
      </div>
    </div>
  );
}

export default function ErrorPage() {
  return (
    <Suspense fallback={<div className="auth-container"><p>Loading...</p></div>}>
      <ErrorContent />
    </Suspense>
  );
} 