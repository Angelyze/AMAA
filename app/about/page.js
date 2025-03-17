'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../providers';

export default function About() {
  const { user } = useAuth();
  
  // Only force light theme if user is not premium
  useEffect(() => {
    if (!user?.isPremium) {
      document.documentElement.classList.remove('dark-theme');
    }
    // If user is premium, respect their theme choice
  }, [user]);
  
  return (
    <div className="container">
      <div className="about-container">
        <div className="logo-container" style={{ textAlign: 'center', width: '100%' }}>
          <Link href="/" className="back-to-home">
            <img src="/AMAA.png" alt="AMAA Logo" className="about-logo" style={{ maxWidth: '400px', display: 'inline-block' }} />
          </Link>
        </div>
        
        <h1 className="about-title" style={{ textAlign: 'center' }}>About AMAA</h1>
        
        <div className="about-section">
          <h2>What is AMAA?</h2>
          <p>
            AMAA (Ask Me Anything About) is an advanced AI assistant designed to provide informative, 
            accurate, and helpful answers to your questions on virtually any topic. Powered by cutting-edge 
            language models, AMAA aims to make knowledge accessible to everyone through natural conversation.
          </p>
          <p>
            Our platform combines the power of AI with an intuitive user interface to create a seamless 
            question-answering experience that feels like talking to a knowledgeable friend.
          </p>
        </div>
        
        <div className="about-section">
          <h2>Our Mission</h2>
          <p>
            Our mission is to democratize access to information by creating an AI assistant that can understand 
            complex questions and provide thoughtful, nuanced responses. We believe that everyone should have 
            access to reliable information presented in a clear, conversational format that adapts to your needs.
          </p>
          <p>
            We're committed to continuous improvement, ethical AI practices, and creating a helpful tool that respects 
            user privacy while delivering exceptional value.
          </p>
        </div>
        
        <div className="about-section">
          <h2>Features</h2>
          <div className="features-grid">
            <div className="feature-card">
              <h3>Instant Answers</h3>
              <p>Get immediate responses to your questions on any topic, from science and history to technology and culture.</p>
            </div>
            
            <div className="feature-card">
              <h3>Voice Input & Text-to-Speech</h3>
              <p>Speak your questions naturally and listen to answers with our advanced text-to-speech technology using Hugging Face models for natural-sounding voices.</p>
            </div>
            
            <div className="feature-card">
              <h3>Photo & Document Upload</h3>
              <p>Upload images and documents for AI analysis, transcription, or examination. Get detailed information about your files with just a simple question.</p>
            </div>
            
            <div className="feature-card">
              <h3>Conversation History</h3>
              <p>AMAA remembers your conversation context, allowing for natural follow-up questions and deeper discussions that you can save and revisit later.</p>
            </div>
            
            <div className="feature-card">
              <h3>Premium Experience</h3>
              <p>Subscribe to unlock premium features including conversation saving, theme customization options, and high-quality voice synthesis. Try free for 7 days!</p>
            </div>
          </div>
        </div>
        
        <div className="about-section">
          <h2>Text-to-Speech Technology</h2>
          <p>
            Our latest update introduces advanced text-to-speech capabilities powered by Hugging Face's state-of-the-art models. 
            Premium users can enjoy:
          </p>
          <ul className="premium-benefits">
            <li>Multiple high-quality voice options with natural intonation</li>
            <li>Adjustable speech speed to match your listening preferences</li>
            <li>Seamless playback controls for a better listening experience</li>
            <li>Smart text processing that optimizes content for speech</li>
            <li>Support for longer passages with consistent voice quality</li>
          </ul>
        </div>
        
        <div className="about-section">
          <h2>Premium Subscription</h2>
          <p>
            Enhance your AMAA experience with our premium subscription. Start with a 7-day free trial, then just $5/month. Premium members enjoy:
          </p>
          <ul className="premium-benefits">
            <li>Full access to all premium features with no limitations</li>
            <li>Ability to save, rename, and manage conversation history</li>
            <li>Dark theme option with customizable interface elements</li>
            <li>High-quality text-to-speech with multiple voice options</li>
            <li>Priority support for any questions or issues</li>
          </ul>
          
          {!user?.isPremium && (
            <div className="about-cta">
              <Link href="/subscribe" className="about-subscribe-btn">
                Upgrade to Premium
              </Link>
            </div>
          )}
        </div>
        
        <div className="about-section">
          <h2>Technology</h2>
          <p>
            AMAA is built using Next.js, a powerful React framework, and leverages state-of-the-art language 
            models to understand and respond to your questions. Our text-to-speech functionality uses advanced models 
            from Hugging Face, including facebook/mms-tts-eng and other high-quality voice synthesis options.
          </p>
          <p>
            Our application is designed to be fast, responsive, and accessible across all devices, with special 
            attention to creating a smooth user experience that feels natural and intuitive.
          </p>
          <p>
            We continuously improve our AI models and user experience based on feedback and the latest 
            advancements in artificial intelligence, natural language processing, and speech synthesis technology.
          </p>
        </div>
        
        <div className="about-section">
          <h2>Privacy & Data</h2>
          <p>
            We take your privacy seriously. AMAA does not store your conversations on our servers unless you 
            explicitly save them as a premium user. Your data is never sold to third parties, and we use 
            industry-standard security practices to protect any information you share with us.
          </p>
          <p>
            For more details, please review our <Link href="/privacy" className="about-link">Privacy Policy</Link>.
          </p>
        </div>
        
        <div className="about-section">
          <h2>Contact Us</h2>
          <p>
            If you have any questions or feedback about AMAA, please feel free to reach out to us:
          </p>
          <p>
            Email: angelyzeshop@gmail.com<br />
            Address: Samobor 10430, Zagreb County, Croatia, EU
          </p>
        </div>
        
        <div className="footer-content">
          <div className="footer-links">
            <Link href="/">Home</Link>&nbsp;&nbsp;|&nbsp;&nbsp;<Link href="/about">About</Link>&nbsp;&nbsp;|&nbsp;&nbsp;<Link href="/terms">Terms</Link>&nbsp;&nbsp;|&nbsp;&nbsp;<Link href="/privacy">Privacy</Link>
          </div>
          <p>© Copyright 2024 <a href="https://amaa.pro" target="_blank" rel="noopener noreferrer" style={{ color: '#0097b2' }}>AMAA.pro</a>. Powered by AMAA</p>
        </div>
      </div>
    </div>
  );
}