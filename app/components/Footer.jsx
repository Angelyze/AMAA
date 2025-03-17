'use client';

import Link from 'next/link';

export default function Footer({ isPremium, handleSubscribe }) {
  return (
    <>
      <p className="premium-pitch">
        {isPremium ? 'Thank you for using AMAA Premium!' : 'Try Premium Free: 7-day trial, then $5/month '}
        {!isPremium && (
          <button 
            onClick={handleSubscribe} 
            style={{
              color: '#4285f4', 
              background: 'none', 
              border: 'none', 
              padding: 0, 
              textDecoration: 'underline', 
              cursor: 'pointer'
            }}
          >
            Start Free Trial
          </button>
        )}
      </p>
      <div className="footer-content">
        <div className="footer-links">
          <Link href="/">Home</Link>&nbsp;&nbsp;|&nbsp;&nbsp;<Link href="/about">About</Link>&nbsp;&nbsp;|&nbsp;&nbsp;<Link href="/terms">Terms</Link>&nbsp;&nbsp;|&nbsp;&nbsp;<Link href="/privacy">Privacy</Link>
        </div>
        <p>© Copyright 2025 <a href="https://amaa.pro" target="_blank" rel="noopener noreferrer" style={{ color: '#0097b2' }}>AMAA.pro</a>. Powered by AMAA</p>
      </div>
    </>
  );
} 