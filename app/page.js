"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import "./globals.css";

export default function Home() {
  const { data: session, status } = useSession();
  console.log("Home component - Session:", session, "Status:", status);

  const [question, setQuestion] = useState("");
  const [conversation, setConversation] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [savedConversations, setSavedConversations] = useState([]);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [isSticky, setIsSticky] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    console.log("useEffect - Session:", session);
    const userIsSubscribed =
      session?.user?.isPremium || (typeof window !== "undefined" && localStorage.getItem("isSubscribed") === "true");
    console.log("useEffect - userIsSubscribed:", userIsSubscribed);
    setIsSubscribed(userIsSubscribed);
    if (userIsSubscribed) {
      const saved = JSON.parse(localStorage.getItem("savedConversations") || "[]");
      setSavedConversations(saved);
    } else {
      setSavedConversations([]);
      setSessionStarted(false);
    }

    let timeoutId;
    const handleScroll = () => {
      clearTimeout(timeoutId);
      const fixedLayout = document.querySelector(".fixed-layout");
      if (fixedLayout) {
        const fixedLayoutRect = fixedLayout.getBoundingClientRect();
        const shouldBeSticky = fixedLayoutRect.bottom <= 0;
        setIsSticky(shouldBeSticky);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(timeoutId);
    };
  }, [session]);

useEffect(() => {
  console.log("useEffect - Session:", session);
  setIsSubscribed(session?.user?.isPremium || false);
  
  if (session?.user?.isPremium) {
    const saved = JSON.parse(localStorage.getItem("savedConversations") || "[]");
    setSavedConversations(saved);
  } else {
    setSavedConversations([]);
    setSessionStarted(false);
  }

  let timeoutId;
  const handleScroll = () => {
    clearTimeout(timeoutId);
    const fixedLayout = document.querySelector(".fixed-layout");
    if (fixedLayout) {
      const fixedLayoutRect = fixedLayout.getBoundingClientRect();
      const shouldBeSticky = fixedLayoutRect.bottom <= 0;
      setIsSticky(shouldBeSticky);
    }
  };

  window.addEventListener("scroll", handleScroll);
  return () => {
    window.removeEventListener("scroll", handleScroll);
    clearTimeout(timeoutId);
  };
}, [session]);

  const handleAsk = async () => {
    if (!question.trim()) return;
    setLoading(true);
    const userMessage = { role: "user", content: question };
    setConversation((prev) => {
      const newConversation = [...prev, userMessage];
      if (!sessionStarted) {
        setSessionStarted(true);
      }
      return newConversation;
    });

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          history: conversation.map((msg) => ({ role: msg.role, content: msg.content })),
        }),
      });
      const data = await res.json();
      const answer = data.answer || "Error: No response";
      setConversation((prev) => [...prev, { role: "assistant", content: answer }]);
    } catch (error) {
      setConversation((prev) => [...prev, { role: "assistant", content: "Error: Something went wrong" }]);
    }

    setQuestion("");
    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !loading) handleAsk();
  };

  const handleVoiceInput = () => {
    if (loading) return;
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setQuestion(transcript);
      handleAsk();
    };
    recognition.onerror = (event) => console.error("Voice error:", event.error);
    recognition.start();
  };

  const handleSearchInput = () => {
    if (!loading) handleAsk();
  };

  const startNewSession = () => {
    setConversation([]);
    setSessionStarted(false);
    setSelectedConversation(null);
    setIsDropdownOpen(false);
  };

  const saveConversation = () => {
    if (isSubscribed && conversation.length > 0) {
      const date = new Date().toISOString().split("T")[0];
      const firstQuestion =
        conversation[0].content.length > 15 ? conversation[0].content.slice(0, 15) : conversation[0].content;
      const convoName = `${firstQuestion} ${date}`;
      const updatedSaved = [
        { name: convoName, messages: [...conversation], expanded: false },
        ...savedConversations,
      ];
      setSavedConversations(updatedSaved);
      localStorage.setItem("savedConversations", JSON.stringify(updatedSaved));
    }
  };

  const loadConversation = (index) => {
    if (index === "") return;
    setConversation([...savedConversations[index].messages]);
    setSelectedConversation(index);
    setIsDropdownOpen(false);
  };

  const deleteConversation = (index) => {
    const updatedSaved = savedConversations.filter((_, i) => i !== index);
    setSavedConversations(updatedSaved);
    localStorage.setItem("savedConversations", JSON.stringify(updatedSaved));
    if (selectedConversation === index) {
      setConversation([]);
      setSelectedConversation(null);
    } else if (selectedConversation !== null && index < selectedConversation) {
      setSelectedConversation(selectedConversation - 1);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  return (
    <div className="container">
      <header className={isSticky ? "header-sticky visible" : "header-right"}>
        {!isSticky && (
          <div className="auth-links">
            {status === "authenticated" ? (
              <>
                <img
                  src={session?.user?.image || "/profile-placeholder.png"}
                  alt="Profile"
                  className="profile-pic"
                />
                <span className="user-greeting">Hello, {session?.user?.name || "User"}!</span>
                <button onClick={() => signOut()} className="auth-link">
                  Logout
                </button>
              </>
            ) : (
              <button onClick={() => signIn()} className="auth-link">
                Log In
              </button>
            )}
          </div>
        )}
        {isSticky && (
          <div className="sticky-content">
            <img src="/AMAA.png" alt="AMAA Logo" className="logo-sticky" />
            <div className="search-container-sticky">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about..."
                className="search-input-sticky"
                disabled={loading}
              />
              <div className="search-options-sticky">
                <button
                  className="option-btn voice-btn"
                  onClick={handleVoiceInput}
                  disabled={loading}
                  aria-label="Voice input"
                >
                  <img src="/MicIcon.png" alt="Mic" className="icon" />
                </button>
                <button
                  className="option-btn search-btn"
                  onClick={handleSearchInput}
                  disabled={loading}
                  aria-label="Search"
                >
                  <img src="/AskIcon.png" alt="Ask" className="icon" />
                </button>
              </div>
            </div>
            <button onClick={scrollToTop} className="back-to-top">
              <img src="/backtotop.png" alt="Back to Top" />
            </button>
          </div>
        )}
      </header>
      <main className="main-centered">
        {isSticky && !isSubscribed && (
          <div className="below-top-bar-ad" style={{ width: "800px" }}>
            Ad Placeholder: Upgrade to Premium to remove ads!
          </div>
        )}
        <div className="fixed-layout">
          <img src="/AMAA.png" alt="AMAA Logo" className="logo" />
          <div className="search-container">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about..."
              className="search-input"
              disabled={loading}
            />
            <div className="search-options">
              <button
                className="option-btn voice-btn"
                onClick={handleVoiceInput}
                disabled={loading}
                aria-label="Voice input"
              >
                <img src="/MicIcon.png" alt="Mic" className="icon" />
              </button>
              <button
                className="option-btn search-btn"
                onClick={handleSearchInput}
                disabled={loading}
                aria-label="Search"
              >
                <img src="/AskIcon.png" alt="Ask" className="icon" />
              </button>
            </div>
          </div>
        </div>
        {isSubscribed && savedConversations.length > 0 && (
          <div className="saved-conversations">
            <label>Saved AMAA:</label>
            <div className="dropdown-wrapper" ref={dropdownRef}>
              <div
                className="dropdown-header"
                onClick={toggleDropdown}
                role="button"
                aria-expanded={isDropdownOpen}
                tabIndex={0}
              >
                {selectedConversation !== null
                  ? savedConversations[selectedConversation].name
                  : "Select an AMAA"}
              </div>
              {isDropdownOpen && (
                <ul className="dropdown-list">
                  <li
                    className="dropdown-item"
                    onClick={() => {
                      setSelectedConversation(null);
                      setConversation([]);
                      setIsDropdownOpen(false);
                    }}
                  >
                    Select an AMAA
                  </li>
                  {savedConversations.map((convo, index) => (
                    <li key={index} className="dropdown-item">
                      <span
                        className="dropdown-item-text"
                        onClick={() => loadConversation(index)}
                      >
                        {convo.name}
                      </span>
                      <button
                        className="delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(index);
                        }}
                        aria-label={`Delete ${convo.name}`}
                      >
                        <img src="/X.png" alt="Delete" className="delete-icon" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button onClick={saveConversation} className="new-session-btn">
              Save AMAA
            </button>
            <button onClick={startNewSession} className="new-session-btn">
              New AMAA
            </button>
          </div>
        )}
        {!isSubscribed && (
          <div className="ad" style={{ width: "800px" }}>
            Ad Placeholder: Upgrade to Premium to remove ads!
          </div>
        )}
        <div className="conversation">
          {conversation.map((msg, index) => (
            <div key={index} className="message">
              <strong className="message-role">{msg.role === "user" ? "YOU:" : "AMAA:"}</strong>
              <div className="message-content">
                {formatAnswer(msg.content)}
              </div>
            </div>
          ))}
        </div>
        <p className="premium-pitch">
          {isSubscribed ? "Thank you for using AMAA Premium!" : "Go Premium: Ad-free answers for $5/month "}
          {!isSubscribed && <a href="/subscribe">Learn More</a>}
        </p>
        <div className="footer-content">
          <div className="footer-links">
            <a href="/about">About</a> | <a href="/terms">Terms</a> |{" "}
            <a href="/privacy">Privacy</a>
          </div>
          <p>Powered by AMAA (Ask Me Anything About...)</p>
        </div>
      </main>
    </div>
  );

  function formatAnswer(text) {
    let cleanedText = text
      .replace(/#+/g, "")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/__/g, "")
      .replace(/\n+/g, "\n")
      .trim();

    const paragraphs = cleanedText.split("\n\n").filter((p) => p.trim());
    if (paragraphs.length > 1) {
      return (
        <>
          {paragraphs.map((para, idx) => {
            const lines = para.split("\n").filter((l) => l.trim());
            if (lines.length > 1 && (lines[0].trim().startsWith("-") || lines[0].trim().startsWith("*"))) {
              return (
                <ul key={idx} className="message-list">
                  {lines.map((line, i) => (
                    <li key={i} className="message-list-item">
                      {line.replace(/^-?\s*|\*\s*/, "")}
                    </li>
                  ))}
                </ul>
              );
            }
            return (
              <p key={idx} className="message-paragraph">
                {para.split("\n").join(" ")}
              </p>
            );
          })}
        </>
      );
    }
    return (
      <p className="message-paragraph">
        {cleanedText}
      </p>
    );
  }
}