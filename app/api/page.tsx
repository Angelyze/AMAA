"use client";

import { useState } from 'react';
import './globals.css';

export default function Home() {
  const [question, setQuestion] = useState('');
  const [conversation, setConversation] = useState([]); // Store conversation history
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!question.trim()) return;
    setLoading(true);
    const userMessage = { role: 'user', content: question };
    setConversation((prev) => [...prev, userMessage]);

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      const answer = data.answer || 'Error: No response';
      setConversation((prev) => [...prev, { role: 'assistant', content: answer }]);
    } catch (error) {
      setConversation((prev) => [...prev, { role: 'assistant', content: 'Error: Something went wrong' }]);
    }

    setQuestion('');
    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) handleAsk();
  };

  const handleVoiceInput = () => {
    if (loading) return;
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setQuestion(transcript);
      handleAsk();
    };
    recognition.onerror = (event) => console.error('Voice error:', event.error);
    recognition.start();
  };

  return (
    <div className="container">
      <header>
        <img src="/AMAA.png" alt="AMAA Logo" className="logo" />
        <a href="/auth" className="auth-link">Login / Sign-up</a>
      </header>
      <main>
        <div className="search-container">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything..."
            className="search-input"
            disabled={loading}
          />
          <div className="search-options">
            <button
              className="option-btn voice-btn"
              onClick={handleVoiceInput}
              disabled={loading}
              aria-label="Voice search"
            >
              🎤
            </button>
          </div>
        </div>
        <div className="search-buttons">
          <button onClick={handleAsk} disabled={loading || !question.trim()}>
            AMAA
          </button>
        </div>
        <div className="conversation">
          {conversation.map((msg, index) => (
            <div key={index} className={`message ${msg.role}`}>
              <strong>{msg.role === 'user' ? 'You' : 'AMAA'}:</strong> {msg.content}
            </div>
          ))}
        </div>
        <p className="premium-pitch">
          Go Premium: Ad-free answers for $5/month{' '}
          <a href="/subscribe">Learn More</a>
        </p>
      </main>
      <footer>
        <div className="footer-links">
          <a href="/about">About</a> | <a href="/terms">Terms</a> |{' '}
          <a href="/privacy">Privacy</a>
        </div>
        <p>Powered by Grok from xAI</p>
      </footer>
    </div>
  );
}