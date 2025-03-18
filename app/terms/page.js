'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../providers';
import usePremiumStatus from '../hooks/usePremiumStatus';

export default function Terms() {
  const { user } = useAuth();
  // Use the usePremiumStatus hook for reliable premium status check
  const { isPremium } = usePremiumStatus();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Use the same structure as About page for consistency
  return (
    <div className="terms-container max-w-4xl mx-auto p-6">
      <div className="terms-header">
        <h1 className="text-3xl font-bold mb-4">Terms of Service</h1>
        <p className="text-lg mb-8">
          Last Updated: March 15, 2024
        </p>
      </div>
      
      <div className="terms-content grid grid-cols-1 gap-8">
        <div className="terms-section">
          <h2 className="text-2xl font-semibold mb-3">1. Introduction</h2>
          <p>
            Welcome to AMAA ("we," "our," or "us"). By accessing or using our website, services, or applications 
            (collectively, the "Services"), you agree to be bound by these Terms of Service ("Terms"). If you do 
            not agree to these Terms, please do not use our Services.
          </p>
          <p className="mt-3">
            These Terms constitute a legally binding agreement between you and AMAA regarding your use of the Services. 
            They govern your access to and use of the Services and any associated content, functionality, and services.
          </p>
        </div>
        
        <div className="terms-section">
          <h2 className="text-2xl font-semibold mb-3">2. Use of Services</h2>
          <p>
            To use certain features of our Services, you may be required to create an account. You are responsible for 
            maintaining the confidentiality of your account credentials and for all activities that occur under your account.
          </p>
          <p className="mt-3">
            You agree to provide accurate, current, and complete information during the registration process and to update 
            such information to keep it accurate, current, and complete. You must not create accounts using automated methods 
            or under false or fraudulent pretenses.
          </p>
          <p className="mt-3">
            We reserve the right to suspend or terminate your account at any time if we suspect that you have breached these 
            Terms or if your use of the Services poses a risk to AMAA or other users.
          </p>
        </div>
        
        <div className="terms-section">
          <h2 className="text-2xl font-semibold mb-3">3. Prohibited Activities</h2>
          <p>
            You agree not to use the Services to:
          </p>
          <ul className="list-disc pl-6 mt-3 space-y-2">
            <li>Violate any applicable law, regulation, or these Terms</li>
            <li>Generate or distribute harmful, offensive, or misleading content</li>
            <li>Infringe upon the intellectual property rights of others</li>
            <li>Attempt to gain unauthorized access to any part of the Services</li>
            <li>Interfere with or disrupt the Services or servers or networks connected to the Services</li>
            <li>Transmit any viruses, worms, or other malicious code</li>
            <li>Collect or store personal data about other users without their express consent</li>
            <li>Use the Services for any commercial purpose without our express consent</li>
          </ul>
        </div>
        
        <div className="terms-section">
          <h2 className="text-2xl font-semibold mb-3">4. Subscription and Payments</h2>
          <p>
            AMAA offers a premium subscription service with a 7-day free trial, followed by $5 per month. By subscribing to our premium service, 
            you agree to the following terms:
          </p>
          <ul className="list-disc pl-6 mt-3 space-y-2">
            <li>Your 7-day free trial begins when you sign up for premium access.</li>
            <li>No payment will be charged during the free trial period.</li>
            <li>After the trial period, subscription fees are charged on a monthly basis.</li>
            <li>Subscriptions automatically renew unless canceled at least 24 hours before the end of the current period.</li>
            <li>You can cancel your subscription at any time through your account settings or by contacting customer support.</li>
            <li>No refunds will be provided for partial subscription periods.</li>
            <li>We reserve the right to change subscription prices upon notice to you. Price changes will take effect at the start of the next subscription period.</li>
          </ul>
          <p className="mt-3">
            Premium features include, but are not limited to, conversation saving and management, 
            theme customization, and enhanced text-to-speech functionality with multiple voice options.
          </p>
          
          {mounted && !isPremium && (
            <div className="mt-6">
              <Link href="/subscribe" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg inline-block">
                Start Free Trial
              </Link>
            </div>
          )}
        </div>
        
        <div className="terms-section">
          <h2 className="text-2xl font-semibold mb-3">5. Intellectual Property</h2>
          <p>
            All content, features, and functionality of the Services, including but not limited to text, graphics, logos, 
            icons, images, audio clips, and software, are owned by AMAA or its licensors and are protected by copyright, 
            trademark, and other intellectual property laws.
          </p>
          <p className="mt-3">
            You may not reproduce, distribute, modify, create derivative works of, publicly display, publicly perform, 
            republish, download, store, or transmit any of the material on our Services without our express written consent.
          </p>
        </div>
        
        <div className="terms-section">
          <h2 className="text-2xl font-semibold mb-3">6. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by applicable law, AMAA shall not be liable for any indirect, incidental, 
            special, consequential, or punitive damages, including but not limited to, loss of profits, data, use, 
            goodwill, or other intangible losses, resulting from your access to or use of or inability to access or 
            use the Services.
          </p>
        </div>
        
        <div className="terms-section">
          <h2 className="text-2xl font-semibold mb-3">7. Changes to Terms</h2>
          <p>
            We may update these Terms from time to time. We will notify you of any changes by posting the new Terms on 
            this page and updating the "Last Updated" date at the top of these Terms. You are advised to review these 
            Terms periodically for any changes.
          </p>
        </div>
        
        <div className="terms-section">
          <h2 className="text-2xl font-semibold mb-3">8. Contact Information</h2>
          <p>
            If you have any questions about these Terms, please contact us at:
          </p>
          <p className="mt-3">
            <a href="mailto:support@askmeanything.ai" className="text-blue-600 hover:underline">support@askmeanything.ai</a>
          </p>
        </div>
      </div>
    </div>
  );
} 