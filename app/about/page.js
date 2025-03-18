'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../providers';
import usePremiumStatus from '../hooks/usePremiumStatus';

export default function About() {
  const { user } = useAuth();
  // Use the usePremiumStatus hook for reliable premium status detection
  const { isPremium } = usePremiumStatus();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // During SSR, don't render the "Upgrade to Premium" button
  if (!mounted) {
    return (
      <div className="about-container">
        <h1>About AMAA - Ask Me Almost Anything</h1>
        {/* ...rest of content... */}
      </div>
    );
  }
  
  return (
    <div className="about-container max-w-4xl mx-auto p-6">
      <div className="about-header">
        <h1 className="text-3xl font-bold mb-4">About AMAA - Ask Me Almost Anything</h1>
        <p className="text-lg mb-8">
          AMAA is your intelligent AI assistant designed to help you find answers to a wide range of questions 
          using the latest advancements in artificial intelligence.
        </p>
      </div>
      
      <div className="about-content grid grid-cols-1 gap-8">
        <div className="about-section">
          <h2 className="text-2xl font-semibold mb-3">Our Mission</h2>
          <p>
            We believe in making AI accessible to everyone. Our mission is to create a friendly assistant 
            that can help with information retrieval, creative tasks, and problem-solving across various domains.
          </p>
          <p>
            AMAA is continuously learning and improving, with the goal of becoming your go-to resource for 
            finding answers and generating useful content.
          </p>
        </div>
        
        <div className="about-section">
          <h2 className="text-2xl font-semibold mb-3">Features</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Natural conversation with an advanced AI</li>
            <li>Text-to-speech capabilities for listening to responses</li>
            <li>Ability to save and reference previous conversations</li>
            <li>Responsive design that works on desktop and mobile devices</li>
            <li>Light and dark themes for comfortable viewing</li>
            <li>Support for a wide range of question types and domains</li>
          </ul>
        </div>
        
        <div className="about-section">
          <h2 className="text-2xl font-semibold mb-3">Premium Subscription</h2>
          <p>
            Enhance your AMAA experience with our premium subscription. Start with a 7-day free trial, then just $5/month. Premium members enjoy:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Full access to all premium features with no limitations</li>
            <li>Ability to save, rename, and manage conversation history</li>
            <li>Dark theme option with customizable interface elements</li>
            <li>High-quality text-to-speech with multiple voice options</li>
            <li>Priority support for any questions or issues</li>
          </ul>
          
          {mounted && !isPremium && (
            <div className="mt-6">
              <Link href="/subscribe" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg inline-block">
                Upgrade to Premium
              </Link>
            </div>
          )}
        </div>
        
        <div className="about-section">
          <h2 className="text-2xl font-semibold mb-3">Technology</h2>
          <p>
            AMAA is built using Next.js, a powerful React framework, and leverages state-of-the-art language 
            models to understand and respond to your questions. Our text-to-speech functionality uses advanced models 
            from Hugging Face, including facebook/mms-tts-eng and other high-quality voice synthesis options.
          </p>
          <p className="mt-3">
            Our application is designed to be fast, responsive, and accessible across all devices, with special 
            attention to creating a smooth user experience that feels natural and intuitive.
          </p>
          <p className="mt-3">
            We continuously improve our AI models and user experience based on feedback and the latest 
            advancements in artificial intelligence, natural language processing, and speech synthesis technology.
          </p>
        </div>
        
        <div className="about-section">
          <h2 className="text-2xl font-semibold mb-3">Privacy & Security</h2>
          <p>
            We take your privacy seriously. AMAA is designed with security in mind, and we do not share your 
            personal information or conversation data with third parties without your explicit consent.
          </p>
          <p className="mt-3">
            For more information about how we handle your data, please review our Privacy Policy.
          </p>
        </div>
        
        <div className="about-section">
          <h2 className="text-2xl font-semibold mb-3">Contact Us</h2>
          <p>
            We're always looking to improve AMAA and welcome your feedback. If you have questions, suggestions, 
            or encounter any issues, please reach out to our support team at:
          </p>
          <p className="mt-3">
            <a href="mailto:support@askmeanything.ai" className="text-blue-600 hover:underline">support@askmeanything.ai</a>
          </p>
        </div>
      </div>
    </div>
  );
}