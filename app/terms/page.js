'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../providers';

export default function Terms() {
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
        <div className="logo-container" style={{ textAlign: 'center', marginBottom: '20px', marginTop: '30px', width: '100%' }}>
          <Link href="/" className="back-to-home">
            <img src="/AMAA.png" alt="AMAA Logo" className="about-logo" style={{ maxWidth: '400px', display: 'inline-block' }} />
          </Link>
        </div>
        
        <h1 className="about-title" style={{ textAlign: 'center' }}>Terms and Conditions</h1>
        
        <div className="about-section">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using the AMAA (Ask Me Anything About) service, website, or application 
            (collectively, the "Service"), you agree to be bound by these Terms and Conditions. If you do not 
            agree to all of these terms, you may not access or use the Service.
          </p>
        </div>
        
        <div className="about-section">
          <h2>2. Description of Service</h2>
          <p>
            AMAA provides an AI-powered question-answering service that allows users to ask questions and 
            receive informative responses. The Service includes both free and premium features, with premium 
            features available through a subscription.
          </p>
          <p>
            The Service includes text-based interactions, voice input, text-to-speech functionality, and 
            the ability to upload photos and documents for analysis, transcription, or information extraction. 
            These features enable users to engage with our AI assistant through multiple modalities.
          </p>
        </div>
        
        <div className="about-section">
          <h2>3. User Accounts</h2>
          <p>
            To access certain features of the Service, you may be required to create an account. You are 
            responsible for maintaining the confidentiality of your account credentials and for all activities 
            that occur under your account. You agree to notify us immediately of any unauthorized use of your 
            account.
          </p>
          <p>
            You must provide accurate, current, and complete information during the registration process and 
            keep your account information updated. We reserve the right to suspend or terminate your account 
            if any information provided proves to be inaccurate, outdated, or incomplete.
          </p>
        </div>
        
        <div className="about-section">
          <h2>4. Subscription and Payments</h2>
          <p>
            AMAA offers a premium subscription service with a 7-day free trial, followed by $5 per month. By subscribing to our premium service, 
            you agree to the following terms:
          </p>
          <ul className="premium-benefits">
            <li>Your 7-day free trial begins when you sign up for premium access.</li>
            <li>No payment will be charged during the free trial period.</li>
            <li>After the trial period, subscription fees are charged on a monthly basis.</li>
            <li>Subscriptions automatically renew unless canceled at least 24 hours before the end of the current period.</li>
            <li>You can cancel your subscription at any time through your account settings or by contacting customer support.</li>
            <li>No refunds will be provided for partial subscription periods.</li>
            <li>We reserve the right to change subscription prices upon notice to you. Price changes will take effect at the start of the next subscription period.</li>
          </ul>
          <p>
            Premium features include, but are not limited to, conversation saving and management, 
            theme customization, and enhanced text-to-speech functionality with multiple voice options.
          </p>
          
          {!user?.isPremium && (
            <div className="about-cta">
              <Link href="/subscribe" className="about-subscribe-btn">
                Start Free Trial
              </Link>
            </div>
          )}
        </div>
        
        <div className="about-section">
          <h2>5. Acceptable Use</h2>
          <p>
            You agree not to use the Service to:
          </p>
          <ul className="premium-benefits">
            <li>Violate any applicable laws or regulations.</li>
            <li>Infringe upon the rights of others, including intellectual property rights.</li>
            <li>Submit content that is unlawful, harmful, threatening, abusive, harassing, defamatory, vulgar, obscene, or otherwise objectionable.</li>
            <li>Attempt to gain unauthorized access to any portion of the Service or any other systems or networks connected to the Service.</li>
            <li>Use the Service to generate content that promotes harmful or illegal activities.</li>
            <li>Interfere with or disrupt the Service or servers or networks connected to the Service.</li>
            <li>Collect or store personal data about other users without their consent.</li>
            <li>Attempt to reverse engineer, decompile, or extract the AI models or algorithms used in the Service.</li>
            <li>Use automated means to access or interact with the Service in a manner that exceeds reasonable use.</li>
          </ul>
        </div>
        
        <div className="about-section">
          <h2>6. Intellectual Property</h2>
          <p>
            The Service and its original content, features, and functionality are owned by AMAA and are 
            protected by international copyright, trademark, patent, trade secret, and other intellectual 
            property or proprietary rights laws.
          </p>
          <p>
            You retain ownership of any content you submit to the Service. By submitting content, you grant 
            us a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, adapt, publish, 
            translate, and distribute your content in connection with the Service.
          </p>
          <p>
            The text-to-speech voices and technology used in the Service are licensed from third-party providers, 
            including Hugging Face. These components are subject to their own licensing terms and may not be 
            extracted, downloaded, or used outside of the Service.
          </p>
        </div>
        
        <div className="about-section">
          <h2>7. Limitation of Liability</h2>
          <p>
            In no event shall AMAA, its officers, directors, employees, or agents be liable for any indirect, 
            incidental, special, consequential, or punitive damages, including without limitation, loss of 
            profits, data, use, goodwill, or other intangible losses, resulting from:
          </p>
          <ul className="premium-benefits">
            <li>Your access to or use of or inability to access or use the Service.</li>
            <li>Any conduct or content of any third party on the Service.</li>
            <li>Any content obtained from the Service.</li>
            <li>Unauthorized access, use, or alteration of your transmissions or content.</li>
            <li>Any inaccuracies or errors in the information provided by the AI assistant.</li>
            <li>Any issues with the text-to-speech functionality or voice synthesis quality.</li>
          </ul>
          <p>
            The information provided by the Service is for general informational purposes only. While we strive 
            for accuracy, we make no guarantees regarding the completeness, reliability, or accuracy of this 
            information. The Service should not be relied upon for critical decisions requiring professional advice.
          </p>
        </div>
        
        <div className="about-section">
          <h2>8. Disclaimer of Warranties</h2>
          <p>
            The Service is provided on an "AS IS" and "AS AVAILABLE" basis. AMAA expressly disclaims all 
            warranties of any kind, whether express or implied, including but not limited to the implied 
            warranties of merchantability, fitness for a particular purpose, and non-infringement.
          </p>
          <p>
            AMAA makes no warranty that the Service will meet your requirements, be available on an 
            uninterrupted, secure, or error-free basis, or that defects will be corrected.
          </p>
          <p>
            AMAA does not guarantee that the AI-generated responses or text-to-speech outputs will be error-free, 
            complete, or suitable for your specific needs or intentions.
          </p>
        </div>
        
        <div className="about-section">
          <h2>9. Termination</h2>
          <p>
            We may terminate or suspend your account and access to the Service immediately, without prior 
            notice or liability, for any reason, including without limitation if you breach these Terms and 
            Conditions.
          </p>
          <p>
            Upon termination, your right to use the Service will immediately cease. If you wish to terminate 
            your account, you may simply discontinue using the Service or contact us to request account deletion.
          </p>
        </div>
        
        <div className="about-section">
          <h2>10. Changes to Terms</h2>
          <p>
            We reserve the right to modify or replace these Terms and Conditions at any time. If a revision is 
            material, we will provide at least 30 days' notice prior to any new terms taking effect. What 
            constitutes a material change will be determined at our sole discretion.
          </p>
          <p>
            By continuing to access or use our Service after any revisions become effective, you agree to be 
            bound by the revised terms. If you do not agree to the new terms, you are no longer authorized to 
            use the Service.
          </p>
        </div>
        
        <div className="about-section">
          <h2>11. Governing Law</h2>
          <p>
            These Terms shall be governed and construed in accordance with the laws of the United States, 
            without regard to its conflict of law provisions.
          </p>
          <p>
            Our failure to enforce any right or provision of these Terms will not be considered a waiver of 
            those rights. If any provision of these Terms is held to be invalid or unenforceable by a court, 
            the remaining provisions of these Terms will remain in effect.
          </p>
        </div>
        
        <div className="about-section">
          <h2>12. Data Usage and AI Training</h2>
          <p>
            By using the Service, you acknowledge that anonymized data from your interactions may be used to improve 
            our AI models and service quality. This data is processed in accordance with our Privacy Policy and is 
            never used to personally identify you.
          </p>
          <p>
            For premium users, your saved conversations are stored securely and associated with your account to 
            provide the conversation history feature. You can delete these saved conversations at any time.
          </p>
        </div>
        
        <div className="about-section">
          <h2>13. Contact Us</h2>
          <p>
            If you have any questions about these Terms and Conditions, please contact us at:
          </p>
          <p>
            Email: angelyzeshop@gmail.com<br />
            Address: Samobor 10430, Zagreb County, Croatia, EU
          </p>
        </div>
        
        <div className="about-section">
          <h2>14. Effective Date</h2>
          <p>
            These Terms and Conditions are effective as of May 15, 2024.
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