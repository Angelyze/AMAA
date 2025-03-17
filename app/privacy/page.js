'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../providers';

export default function Privacy() {
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
        
        <h1 className="about-title" style={{ textAlign: 'center' }}>Privacy Policy</h1>
        
        <div className="about-section">
          <h2>1. Introduction</h2>
          <p>
            At AMAA (Ask Me Anything About), we respect your privacy and are committed to protecting your personal data. 
            This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our 
            service, website, or application (collectively, the "Service").
          </p>
          <p>
            Please read this Privacy Policy carefully. If you do not agree with the terms of this Privacy Policy, 
            please do not access the Service.
          </p>
        </div>
        
        <div className="about-section">
          <h2>2. Information We Collect</h2>
          <p>
            We collect several types of information from and about users of our Service, including:
          </p>
          <ul className="premium-benefits">
            <li><strong>Personal Data:</strong> Email address, name, and profile information when you create an account.</li>
            <li><strong>Usage Data:</strong> Information about how you use our Service, including your queries and interactions.</li>
            <li><strong>Conversation Data:</strong> The questions you ask and the responses you receive.</li>
            <li><strong>Photo and Document Data:</strong> When you upload images or documents for analysis, we process this content to provide our service.</li>
            <li><strong>Voice Data:</strong> When you use voice input features, we process audio data to convert it to text.</li>
            <li><strong>Text-to-Speech Preferences:</strong> Your selected voice options and playback settings.</li>
            <li><strong>Payment Information:</strong> When you subscribe to our premium service, we collect payment details through our secure payment processor.</li>
            <li><strong>Device Information:</strong> Information about your device, browser type, IP address, and operating system.</li>
          </ul>
        </div>
        
        <div className="about-section">
          <h2>3. How We Collect Information</h2>
          <p>
            We collect information in the following ways:
          </p>
          <ul className="premium-benefits">
            <li><strong>Direct Interactions:</strong> Information you provide when creating an account, subscribing to our service, or using our features.</li>
            <li><strong>Voice Input:</strong> When you use voice input features, your audio is temporarily processed to convert it to text.</li>
            <li><strong>Photo and Document Uploads:</strong> When you upload files for analysis, your content is processed to extract information or provide transcriptions.</li>
            <li><strong>Text-to-Speech Usage:</strong> When you use our text-to-speech features, we process your content and voice preferences.</li>
            <li><strong>Automated Technologies:</strong> As you navigate through our Service, we may use cookies, local storage, and similar technologies to collect certain information about your equipment, browsing actions, and patterns.</li>
            <li><strong>Third-Party Sources:</strong> We may receive information about you from third-party services when you choose to log in using social media accounts.</li>
          </ul>
        </div>
        
        <div className="about-section">
          <h2>4. How We Use Your Information</h2>
          <p>
            We use the information we collect about you for various purposes, including:
          </p>
          <ul className="premium-benefits">
            <li>Providing, maintaining, and improving our Service, including text-to-speech functionality.</li>
            <li>Processing your subscription and managing your account.</li>
            <li>Personalizing your experience and delivering content relevant to your interests.</li>
            <li>Analyzing uploaded photos and documents based on your requests.</li>
            <li>Responding to your inquiries and providing customer support.</li>
            <li>Sending you technical notices, updates, security alerts, and administrative messages.</li>
            <li>Monitoring and analyzing usage patterns and trends to enhance the Service.</li>
            <li>Training and improving our AI models with anonymized data.</li>
            <li>Detecting, preventing, and addressing technical issues or fraudulent activities.</li>
            <li>Complying with legal obligations.</li>
          </ul>
        </div>
        
        <div className="about-section">
          <h2>5. Data Storage and Security</h2>
          <p>
            For free users, we do not store your conversations on our servers beyond the current session unless 
            required for service improvement or troubleshooting purposes.
          </p>
          <p>
            For premium users, we store your saved conversations to provide the conversation history feature. 
            These conversations are stored securely and associated with your account.
          </p>
          <p>
            Uploaded photos and documents are processed in real-time and are not stored after analysis unless you explicitly 
            save the conversation as a premium user. Voice input data is processed in real-time and is not stored after 
            conversion to text. Text-to-speech processing is performed as needed when you request audio playback and is not permanently stored.
          </p>
          <p>
            We implement appropriate technical and organizational measures to protect your personal data against 
            unauthorized or unlawful processing, accidental loss, destruction, or damage. However, no method of 
            transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
          </p>
        </div>
        
        <div className="about-section">
          <h2>6. Data Sharing and Disclosure</h2>
          <p>
            We may share your information in the following circumstances:
          </p>
          <ul className="premium-benefits">
            <li><strong>Service Providers:</strong> We may share your information with third-party vendors, service providers, and other business partners who perform services on our behalf, including our text-to-speech technology providers.</li>
            <li><strong>Business Transfers:</strong> If we are involved in a merger, acquisition, or sale of all or a portion of our assets, your information may be transferred as part of that transaction.</li>
            <li><strong>Legal Requirements:</strong> We may disclose your information if required to do so by law or in response to valid requests by public authorities.</li>
            <li><strong>Protection of Rights:</strong> We may disclose your information to protect the rights, property, or safety of AMAA, our users, or others.</li>
          </ul>
          <p>
            We do not sell your personal data to third parties.
          </p>
        </div>
        
        <div className="about-section">
          <h2>7. Your Data Protection Rights</h2>
          <p>
            Depending on your location, you may have certain rights regarding your personal data, including:
          </p>
          <ul className="premium-benefits">
            <li><strong>Access:</strong> The right to request copies of your personal data.</li>
            <li><strong>Rectification:</strong> The right to request that we correct inaccurate or incomplete information about you.</li>
            <li><strong>Erasure:</strong> The right to request that we delete your personal data in certain circumstances.</li>
            <li><strong>Restriction:</strong> The right to request that we restrict the processing of your personal data in certain circumstances.</li>
            <li><strong>Data Portability:</strong> The right to receive your personal data in a structured, commonly used format.</li>
            <li><strong>Objection:</strong> The right to object to our processing of your personal data in certain circumstances.</li>
          </ul>
          <p>
            To exercise any of these rights, please contact us using the information provided in the "Contact Us" section.
          </p>
        </div>
        
        <div className="about-section">
          <h2>8. Children's Privacy</h2>
          <p>
            Our Service is not intended for children under the age of 13. We do not knowingly collect personal 
            information from children under 13. If you are a parent or guardian and believe that your child has 
            provided us with personal information, please contact us so that we can take necessary actions.
          </p>
        </div>
        
        <div className="about-section">
          <h2>9. Cookies and Tracking Technologies</h2>
          <p>
            We use cookies and similar tracking technologies to track activity on our Service and hold certain information. 
            Cookies are files with a small amount of data that may include an anonymous unique identifier.
          </p>
          <p>
            You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, 
            if you do not accept cookies, you may not be able to use some portions of our Service.
          </p>
        </div>
        
        <div className="about-section">
          <h2>10. Third-Party Services and APIs</h2>
          <p>
            Our Service may contain links to third-party websites or services that are not owned or controlled by AMAA. 
            We have no control over and assume no responsibility for the content, privacy policies, or practices of 
            any third-party websites or services.
          </p>
          <p>
            We use third-party APIs and services, including Hugging Face's text-to-speech models, to provide certain 
            features. These services receive the data necessary to perform their functions (such as text to be converted 
            to speech) but are contractually limited in how they can use this data.
          </p>
        </div>
        
        <div className="about-section">
          <h2>11. International Data Transfers</h2>
          <p>
            Your information may be transferred to and processed in countries other than the country in which you reside. 
            These countries may have data protection laws that are different from the laws of your country.
          </p>
          <p>
            By using our Service, you consent to the transfer of your information to countries outside your country 
            of residence, including the United States, where our primary servers are located.
          </p>
        </div>
        
        <div className="about-section">
          <h2>12. AI Model Training</h2>
          <p>
            To improve our service quality and AI capabilities, we may use anonymized data from user interactions 
            to train and refine our AI models. This data is processed in a way that does not identify individual users.
          </p>
          <p>
            Premium users can opt out of having their data used for AI training by contacting our support team. 
            This will not affect the quality of service you receive but helps us respect your privacy preferences.
          </p>
        </div>
        
        <div className="about-section">
          <h2>13. Changes to This Privacy Policy</h2>
          <p>
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the 
            new Privacy Policy on this page and updating the "Effective Date" at the bottom.
          </p>
          <p>
            You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy 
            are effective when they are posted on this page.
          </p>
        </div>
        
        <div className="about-section">
          <h2>14. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at:
          </p>
          <p>
            Email: angelyzeshop@gmail.com<br />
            Address: Samobor 10430, Zagreb County, Croatia, EU
          </p>
        </div>
        
        <div className="about-section">
          <h2>15. Effective Date</h2>
          <p>
            This Privacy Policy is effective as of May 15, 2024.
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