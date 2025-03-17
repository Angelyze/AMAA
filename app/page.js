"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import "./globals.css";
import { useAuth } from './providers';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatAnswer } from './utils/formatters';
import UserArea from './components/UserArea';
import { ThemeProvider } from 'next-themes';
import { useDropdownFix } from './utils/dropdown-fix';
import SearchBar from './components/SearchBar';
import Conversation from './components/Conversation';
import Message from './components/Message';
import Header from './components/Header';
import Footer from './components/Footer';
import StickyHeader from './components/StickyHeader';
import ConversationControls from './components/ConversationControls';
import LoginModal from './components/LoginModal';
import ErrorBoundary from './components/ErrorBoundary';
import { testAuth } from './utils/firebase';

export default function Home() {
  const [question, setQuestion] = useState("");
  const [conversation, setConversation] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [savedConversations, setSavedConversations] = useState([]);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [isSticky, setIsSticky] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const conversationRef = useRef([]);
  const forceUpdate = useState({})[1];
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginError, setLoginError] = useState('');
  const { user, loading: authLoading, signIn, signOut, signInWithProvider } = useAuth();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const menuRef = useRef(null);
  const [copiedMessageVisible, setCopiedMessageVisible] = useState(false);
  const [fontSize, setFontSize] = useState(16); // Default font size
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileUploaded, setFileUploaded] = useState(false);
  const [isTtsEnabled, setIsTtsEnabled] = useState(false);
  const [ttsSpeed, setTtsSpeed] = useState(1);
  const [availableTtsVoices, setAvailableTtsVoices] = useState([]);
  const [ttsVoice, setTtsVoice] = useState(null);
  const [isTtsDropdownOpen, setIsTtsDropdownOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  // Store the full text and current position for TTS
  const ttsTextRef = useRef('');
  const ttsChunksRef = useRef([]);
  const ttsCurrentChunkRef = useRef(0);

  useEffect(() => {
    // Check if user is logged in from localStorage
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        // Don't use setUser here as it's not defined in this component
        // setUser(parsedUser);
        
        // Just update premium status from localStorage
        setIsPremium(parsedUser.isPremium === true);
        
        // Load saved conversations if premium
        if (parsedUser.isPremium === true) {
          const saved = JSON.parse(localStorage.getItem('savedConversations') || '[]');
          setSavedConversations(saved);
        }
      } catch (error) {
        console.error("Error parsing saved user:", error);
        // Clear invalid data
        localStorage.removeItem('user');
        setIsPremium(false);
      }
    } else {
      // No user found, ensure not subscribed
      setIsPremium(false);
      setSavedConversations([]);
    }

    // Simplified scroll handler that just updates isSticky state for AdBanner
    const handleScroll = () => {
      const fixedLayout = document.querySelector('.fixed-layout');
      if (fixedLayout) {
        const fixedLayoutRect = fixedLayout.getBoundingClientRect();
        const shouldBeSticky = fixedLayoutRect.bottom <= 0;
        setIsSticky(shouldBeSticky);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    conversationRef.current = conversation;
  }, [conversation]);

  useEffect(() => {
    // Check if user is premium
    if (user?.isPremium) {
      setIsPremium(true);
      
      // Load saved conversations
      const saved = JSON.parse(localStorage.getItem('savedConversations') || '[]');
      setSavedConversations(saved);
    } else {
      setIsPremium(false);
    }
    
    // ... rest of your existing useEffect code
  }, [user]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    // Only apply saved theme if user is premium
    if (user?.isPremium) {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'dark') {
        setIsDarkTheme(true);
        document.documentElement.classList.add('dark-theme');
      }
    } else {
      // Reset to light theme if not premium
      setIsDarkTheme(false);
      document.documentElement.classList.remove('dark-theme');
    }
  }, [user]);

  useEffect(() => {
    // Initialize Web Speech API and get available voices
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      // Function to process browser voices
      const processBrowserVoices = () => {
        const browserVoices = window.speechSynthesis.getVoices();
        
        // Define the preferred order for Google voices
        const googleVoiceOrder = [
          'Google UK English Male',
          'Google US English Male',
          'Google UK English Female',
          'Google US English Female',
          'Google UK English',
          'Google US English'
        ];
        
        // Define the preferred order for Microsoft voices
        const microsoftVoiceOrder = [
          'Microsoft David',
          'Microsoft Mark',
          'Microsoft Zira'
        ];
        
        // Sort Google voices according to preferred order
        const googleVoices = browserVoices
          .filter(voice => voice.name.toLowerCase().includes('google'))
          .sort((a, b) => {
            const indexA = googleVoiceOrder.indexOf(a.name);
            const indexB = googleVoiceOrder.indexOf(b.name);
            if (indexA === -1 && indexB === -1) return 0;
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
          });
        
        // Sort Microsoft voices according to preferred order
        const microsoftVoices = browserVoices
          .filter(voice => voice.name.toLowerCase().includes('microsoft'))
          .sort((a, b) => {
            const indexA = microsoftVoiceOrder.indexOf(a.name);
            const indexB = microsoftVoiceOrder.indexOf(b.name);
            if (indexA === -1 && indexB === -1) return 0;
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
          });
        
        // Get remaining voices
        const otherVoices = browserVoices.filter(voice => 
          !voice.name.toLowerCase().includes('google') && 
          !voice.name.toLowerCase().includes('microsoft')
        );
        
        // Combine voices in priority order
        const allVoices = [
          ...googleVoices,
          ...microsoftVoices,
          ...otherVoices
        ].map(voice => ({
          name: voice.name,
          type: 'browser',
          voice: voice
        }));
        
        // Update state with all available voices
        setAvailableTtsVoices(allVoices);
        
        // Set default voice (prefer Google UK English Male)
        const defaultVoice = allVoices.find(v => 
          v.name === 'Google UK English Male'
        ) || allVoices[0];
        
        if (defaultVoice && !ttsVoice) {
          setTtsVoice(defaultVoice);
        }
      };
      
      // Try to get voices immediately
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        processBrowserVoices();
      } else {
        // If voices not immediately available, wait for voiceschanged event
        const voicesChangedHandler = () => {
          processBrowserVoices();
          // Remove event listener after getting voices
          window.speechSynthesis.removeEventListener('voiceschanged', voicesChangedHandler);
        };
        
        window.speechSynthesis.addEventListener('voiceschanged', voicesChangedHandler);
      }
    }
  }, []);

  const handleAsk = async () => {
    if (!question.trim()) return;
    
    const currentQuestion = question.trim();
    setLoading(true);
    
    const userMessage = { role: 'user', content: currentQuestion };
    
    const currentConversation = [...conversationRef.current];
    const updatedConversation = [...currentConversation, userMessage];
    
    setConversation(updatedConversation);
    conversationRef.current = updatedConversation;
    
    if (!sessionStarted) {
      setSessionStarted(true);
    }
    
    setQuestion('');
    
    try {
      console.log("Sending question:", currentQuestion);
      console.log("With history length:", updatedConversation.length);
      
      let endpoint = '/api/ask';
      let payload = {
        question: currentQuestion,
        history: updatedConversation.map(msg => ({ role: msg.role, content: msg.content })),
      };
      
      // If we have an uploaded file, use the analyze endpoint and include file data
      if (fileUploaded && uploadedFile) {
        endpoint = '/api/analyze';
        payload = {
          ...payload,
          fileData: uploadedFile
        };
      }
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      let answer = data.answer || 'Error: No response';
      
      if (question.toLowerCase().includes('premium') || question.toLowerCase().includes('subscribe') || question.toLowerCase().includes('trial')) {
        answer = "AMAA Premium gives you access to advanced features like saving conversations, text-to-speech, and customization options. You can try it free for 7 days, then it's just $5/month to continue. Start your free trial today!";
      }
      
      const finalConversation = [...updatedConversation, { role: 'assistant', content: answer }];
      setConversation(finalConversation);
      conversationRef.current = finalConversation;
      
      console.log("Updated conversation length:", finalConversation.length);
      
      // Reset file upload state after successful analysis
      if (fileUploaded) {
        setFileUploaded(false);
        setUploadedFile(null);
      }
      
      forceUpdate({});
      
      setTimeout(() => scrollToTop(), 100);
    } catch (error) {
      console.error("Error in handleAsk:", error);
      
      const errorConversation = [...updatedConversation, { role: 'assistant', content: 'Error: Something went wrong' }];
      setConversation(errorConversation);
      conversationRef.current = errorConversation;
      
      forceUpdate({});
      
      setTimeout(() => scrollToTop(), 100);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) handleAsk();
  };

  const handleVoiceInput = () => {
    if (loading) return;
    
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
      alert('Speech recognition is not supported in your browser. Please try Chrome or Edge.');
      return;
    }
    
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'en-US';
    
    setQuestion('Listening...');
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      console.log("Voice transcript received:", transcript);
      
      // Don't just set the question, directly call handleAsk with the transcript
      const currentQuestion = transcript.trim();
      
      // Create the user message
      const userMessage = { role: 'user', content: currentQuestion };
      
      // Update conversation state with the new user message
      const updatedConversation = [...conversationRef.current, userMessage];
      setConversation(updatedConversation);
      conversationRef.current = updatedConversation;
      
      // Set session started if it's not already
      if (!sessionStarted) {
        setSessionStarted(true);
      }
      
      // Clear the input field
      setQuestion('');
      setLoading(true); // Show loading indicator
      
      // Make the API request
      fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQuestion,
          history: updatedConversation.map(msg => ({ role: msg.role, content: msg.content })),
        }),
      })
        .then(res => res.json())
        .then(data => {
          let answer = data.answer || 'Error: No response';
          
          if (currentQuestion.toLowerCase().includes('premium') || currentQuestion.toLowerCase().includes('subscribe') || currentQuestion.toLowerCase().includes('trial')) {
            answer = "AMAA Premium gives you access to advanced features like saving conversations, text-to-speech, and customization options. You can try it free for 7 days, then it's just $5/month to continue. Start your free trial today!";
          }
          
          // Update conversation with the assistant's response
          const finalConversation = [...updatedConversation, { role: 'assistant', content: answer }];
          setConversation(finalConversation);
          conversationRef.current = finalConversation;
          
          // Force a re-render to ensure the UI is updated
          forceUpdate({});
          
          // Scroll to top to show the new message
          setTimeout(() => scrollToTop(), 100);
          
          setLoading(false); // Hide loading indicator
        })
        .catch(error => {
          console.error("Error in voice input:", error);
          
          const errorConversation = [...updatedConversation, { role: 'assistant', content: 'Error: Something went wrong' }];
          setConversation(errorConversation);
          conversationRef.current = errorConversation;
          
          // Force a re-render
          forceUpdate({});
          
          setLoading(false); // Hide loading indicator
        });
    };
    
    recognition.onerror = (event) => {
      console.error('Voice error:', event.error);
      setQuestion('');
      alert('Voice recognition error. Please try again.');
    };
    
    recognition.onend = () => {
      if (question === 'Listening...') {
        setQuestion('');
      }
    };
    
    recognition.start();
  };

  const handleSearchInput = () => {
    if (!loading) handleAsk();
  };

  const handlePhotoUpload = async (file) => {
    if (!file) {
      console.error("No file provided");
      return;
    }
    
    try {
      setLoading(true);
      
      // Check file type and size
      const acceptedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", 
                            "application/pdf", "application/msword", 
                            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
      
      if (!acceptedTypes.includes(file.type)) {
        alert("Unsupported file type. Please upload an image, PDF, or Word document.");
        setLoading(false);
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) { // Limit to 10MB
        alert("File is too large. Please upload a file smaller than 10MB.");
        setLoading(false);
        return;
      }
      
      // Read the file
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          // Store the file data
          const fileData = {
            name: file.name,
            type: file.type,
            data: event.target.result, // Base64 data
            size: file.size
          };
          
          console.log(`Loaded file: ${file.name} (${file.type}, ${Math.round(file.size/1024)}KB)`);
          
          // Set state to indicate file is uploaded
          setFileUploaded(true);
          setUploadedFile(fileData);
          
          // Don't set a predefined question
          setQuestion('');
          
          setLoading(false);
        } catch (error) {
          console.error("Error processing file data:", error);
          alert("Error processing file. Please try again.");
          setFileUploaded(false);
          setUploadedFile(null);
          setLoading(false);
        }
      };
      
      reader.onerror = (error) => {
        console.error("File reading error:", error);
        alert("Error reading file. Please try a different file.");
        setLoading(false);
      };
      
      // Start reading the file as a data URL (base64)
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("File upload error:", error);
      alert("Error uploading file. Please try again.");
      setLoading(false);
    }
  };

  const toggleSubscription = () => {
    const newStatus = !isPremium;
    setIsPremium(newStatus);
    localStorage.setItem('isPremium', newStatus);
    if (newStatus) {
      const saved = JSON.parse(localStorage.getItem('savedConversations') || '[]');
      setSavedConversations(saved);
    } else {
      setSavedConversations([]);
      setSessionStarted(false);
    }
  };

  const startNewSession = () => {
    setConversation([]);
    setSessionStarted(false);
    setSelectedConversation(null);
    setIsDropdownOpen(false);
  };

  const saveConversation = () => {
    if (isPremium && conversation.length > 0) {
      const date = new Date().toISOString().split('T')[0];
      const firstQuestion = conversation[0].content.length > 20 
        ? `${conversation[0].content.slice(0, 20)}...` 
        : conversation[0].content;
      const convoName = `${firstQuestion} | ${date}`;
      const updatedSaved = [
        { name: convoName, messages: [...conversation], expanded: false },
        ...savedConversations,
      ];
      setSavedConversations(updatedSaved);
      localStorage.setItem('savedConversations', JSON.stringify(updatedSaved));
    }
  };

  const loadConversation = (index) => {
    if (index === '') return;
    
    const loadedConversation = JSON.parse(JSON.stringify(savedConversations[index].messages));
    
    setConversation(loadedConversation);
    conversationRef.current = loadedConversation;
    
    setSelectedConversation(index);
    setSessionStarted(true);
    setIsDropdownOpen(false);
    
    console.log("Loaded conversation:", loadedConversation);
    
    forceUpdate({});
  };

  const deleteConversation = (index) => {
    const updatedSaved = savedConversations.filter((_, i) => i !== index);
    setSavedConversations(updatedSaved);
    localStorage.setItem('savedConversations', JSON.stringify(updatedSaved));
    if (selectedConversation === index) {
      setConversation([]);
      setSelectedConversation(null);
    } else if (selectedConversation !== null && index < selectedConversation) {
      setSelectedConversation(selectedConversation - 1);
    }
  };

  const renameConversation = (index, newName) => {
    if (index >= 0 && index < savedConversations.length) {
      const updatedSaved = [...savedConversations];
      updatedSaved[index] = { ...updatedSaved[index], name: newName };
      setSavedConversations(updatedSaved);
      localStorage.setItem('savedConversations', JSON.stringify(updatedSaved));
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleDropdown = () => {
    // Let the ConversationControls component handle this
  };

  const handleAuth = () => {
    if (user) {
      signOut();
    } else {
      // Show login modal
      setShowLoginModal(true);
    }
  };

  const handleLogin = async (e, email, password, setLoginError) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      setLoginError('Please enter a valid email address');
      return;
    }
    
    try {
      // Clear any previous errors
      setLoginError('');
      console.log('Testing Firebase Auth connection first...');
      
      // Set loading state
      setLoading(true);
      
      // Test Firebase Auth first
      const testResult = await testAuth(email, password);
      
      if (testResult.success) {
        console.log('Test login successful, proceeding with real login');
        
        // Now proceed with regular login that updates state
        const result = await signIn(email, password);
        
        if (result.success) {
          console.log('Login success, closing modal');
          setShowLoginModal(false);
          
          // Set premium status to true for now
          setIsPremium(true);
          
          // Try to load saved conversations
          try {
            const saved = localStorage.getItem('savedConversations');
            if (saved) {
              setSavedConversations(JSON.parse(saved));
            }
          } catch (err) {
            console.error('Error loading conversations:', err);
          }
        } else {
          console.error('Login failed after test success:', result.error);
          setLoginError(result.error || 'Login failed. Please check your credentials.');
        }
      } else {
        console.error('Test login failed:', testResult.error, testResult.code);
        
        // Show specific error for network issues
        if (testResult.code === 'auth/network-request-failed') {
          setLoginError('Network error connecting to authentication service. Please check your internet connection and try again.');
        } else {
          setLoginError(testResult.error || 'Login failed. Please check your credentials.');
        }
      }
    } catch (error) {
      console.error('Login process error:', error);
      setLoginError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    // Sign out using the AuthContext
    signOut();
    
    // Reset conversation and other state
    setConversation([]);
    setSessionStarted(false);
    setSavedConversations([]);
  };

  const handleAuthClick = () => {
    if (user) {
      handleLogout();
    } else {
      setShowLoginModal(true);
    }
  };

  const handleSubscribe = () => {
    router.push('/subscribe');
  };

  const handleSocialLogin = async (provider) => {
    try {
      // The signInWithProvider function handles the redirect
      await signInWithProvider(provider);
    } catch (error) {
      console.error('Social login error:', error);
      setLoginError('An error occurred during login');
    }
  };

  const toggleTheme = () => {
    if (isDarkTheme) {
      document.documentElement.classList.remove('dark-theme');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.add('dark-theme');
      localStorage.setItem('theme', 'dark');
    }
    setIsDarkTheme(!isDarkTheme);
  };

  const handleSignOut = () => {
    setShowUserMenu(false);
    // Reset to light theme when signing out
    document.documentElement.classList.remove('dark-theme');
    setIsDarkTheme(false);
    signOut();
  };

  const copyAnswerToClipboard = (content) => {
    navigator.clipboard.writeText(content)
      .then(() => {
        // Show a temporary "Copied!" message
        setCopiedMessageVisible(true);
        setTimeout(() => setCopiedMessageVisible(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
      });
  };

  const increaseFontSize = () => {
    setFontSize(prevSize => Math.min(prevSize + 2, 24)); // Maximum 24px (was 22px)
  };

  const decreaseFontSize = () => {
    setFontSize(prevSize => Math.max(prevSize - 2, 14)); // Minimum 14px (was 12px)
  };

  const toggleTts = () => {
    const newTtsState = !isTtsEnabled;
    setIsTtsEnabled(newTtsState);
    
    // If turning off TTS, cancel any ongoing speech
    if (!newTtsState && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    }
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      // Pause current playback
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        setIsPlaying(false);
      }
    } else {
      // Resume from beginning
      restartLastTTS();
    }
  };

  const speakText = (text) => {
    if (!window.speechSynthesis) {
      console.error('Speech synthesis not supported in this browser');
      return false;
    }
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    // Clean the text for speech synthesis
    const cleanText = text
      .replace(/```[^`]*```/g, '') // Remove code blocks
      .replace(/`([^`]+)`/g, '$1') // Remove inline code backticks
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markers
      .replace(/\*(.*?)\*/g, '$1') // Remove italic markers
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1') // Convert links to just text
      .replace(/<[^>]*>/g, '') // Remove any HTML tags
      .replace(/#+\s+([^\n]+)/g, '$1') // Remove heading markers
      .replace(/^\s*[-*+]\s+/gm, '') // Remove list markers
      .replace(/^\s*\d+\.\s+/gm, '') // Remove numbered list markers
      .replace(/\n\n/g, '. ') // Replace double newlines with period + space
      .replace(/\n/g, ' '); // Replace single newlines with space
    
    // Set up a speech utterance with the entire text
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Set voice if available
    if (ttsVoice?.voice) {
      utterance.voice = ttsVoice.voice;
    }
    
    // Set speed
    utterance.rate = ttsSpeed;
    
    // Handle events
    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = (error) => {
      console.error('Speech synthesis error:', error);
      setIsPlaying(false);
    };
    
    // Store text and utterance for potential restart
    ttsTextRef.current = cleanText;
    
    // Clear any previous timeouts
    if (window.ttsTimeoutId) {
      clearTimeout(window.ttsTimeoutId);
    }
    
    // Start speaking
    window.speechSynthesis.speak(utterance);
    
    // Set up a periodic check to ensure long texts continue playing
    const ensureSpeaking = () => {
      if (window.speechSynthesis.speaking) {
        // Force the speech synthesis to continue
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
        
        // Check again in 10 seconds
        window.ttsTimeoutId = setTimeout(ensureSpeaking, 10000);
      }
    };
    
    // Start the periodic check after 10 seconds
    window.ttsTimeoutId = setTimeout(ensureSpeaking, 10000);
    
    return true;
  };
  
  // Helper function to restart TTS from the beginning
  const restartLastTTS = () => {
    // Get the latest message from the assistant
    const assistantMessages = conversation.filter(msg => msg.role === 'assistant');
    if (assistantMessages.length > 0) {
      const latestMessage = assistantMessages[assistantMessages.length - 1].content;
      speakText(latestMessage);
    }
  };
  
  useEffect(() => {
    // When speed changes, restart TTS if it was playing
    if (isTtsEnabled && window.speechSynthesis && isPlaying) {
      restartLastTTS();
    }
  }, [ttsSpeed]);
  
  useEffect(() => {
    // When voice changes, restart TTS if it was playing
    if (isTtsEnabled && window.speechSynthesis && isPlaying) {
      restartLastTTS();
    }
  }, [ttsVoice]);
  
  // Initialize speech synthesis workaround for Chrome
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      // Chrome has a bug where it cuts off speech after ~15 seconds
      // This is a workaround to keep it going
      const chromeWorkaround = () => {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
          window.chromeTtsWorkaround = setTimeout(chromeWorkaround, 5000);
        }
      };
      
      // Start the workaround when needed
      if (isPlaying) {
        window.chromeTtsWorkaround = setTimeout(chromeWorkaround, 5000);
      }
      
      return () => {
        // Clean up the workaround
        if (window.chromeTtsWorkaround) {
          clearTimeout(window.chromeTtsWorkaround);
        }
      };
    }
  }, [isPlaying]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (window.ttsTimeoutId) {
        clearTimeout(window.ttsTimeoutId);
      }
      if (window.chromeTtsWorkaround) {
        clearTimeout(window.chromeTtsWorkaround);
      }
    };
  }, []);

  useEffect(() => {
    // Check if we have a new assistant message to speak
    if (
      isTtsEnabled &&
      conversation.length > 0 &&
      conversation[conversation.length - 1].role === 'assistant' &&
      !loading
    ) {
      // Get the last assistant message
      const lastMessage = conversation[conversation.length - 1];
      speakText(lastMessage.content);
    }
  }, [conversation, loading, isTtsEnabled]);

  return (
    <div className="container">
      <Header
        user={user}
        isDarkTheme={isDarkTheme}
        toggleTheme={toggleTheme}
        handleSignOut={handleSignOut}
        handleAuth={handleAuth}
        handleSubscribe={handleSubscribe}
      />
      
      <StickyHeader
        question={question}
        setQuestion={setQuestion}
        handleKeyPress={handleKeyPress}
        handleVoiceInput={handleVoiceInput}
        handleSearchInput={handleSearchInput}
        handlePhotoUpload={handlePhotoUpload}
        loading={loading}
        scrollToTop={scrollToTop}
        fileUploaded={fileUploaded}
      />
      
      <main className="main-centered">
        <div className="fixed-layout" id="main-search-container">
          <div className="logo-container">
            <img 
              src="/AMAA.png" 
              alt="AMAA Logo" 
              className="logo" 
              title="Ask Me Anything About"
            />
          </div>
          <SearchBar
            question={question}
            setQuestion={setQuestion}
            handleKeyPress={handleKeyPress}
            handleVoiceInput={handleVoiceInput}
            handleSearchInput={handleSearchInput}
            handlePhotoUpload={handlePhotoUpload}
            loading={loading}
            isSticky={false}
            fileUploaded={fileUploaded}
          />
        </div>
        
        {isPremium && (
          <ConversationControls
            isPremium={isPremium}
            savedConversations={savedConversations}
            selectedConversation={selectedConversation}
            setSelectedConversation={setSelectedConversation}
            setConversation={setConversation}
            isDropdownOpen={isDropdownOpen}
            setIsDropdownOpen={setIsDropdownOpen}
            loadConversation={loadConversation}
            deleteConversation={deleteConversation}
            renameConversation={renameConversation}
            saveConversation={saveConversation}
            startNewSession={startNewSession}
            isTtsEnabled={isTtsEnabled}
            toggleTts={toggleTts}
            ttsVoice={ttsVoice}
            setTtsVoice={setTtsVoice}
            ttsSpeed={ttsSpeed}
            setTtsSpeed={setTtsSpeed}
            availableTtsVoices={availableTtsVoices}
            isTtsDropdownOpen={isTtsDropdownOpen}
            setIsTtsDropdownOpen={setIsTtsDropdownOpen}
            isPlaying={isPlaying}
            togglePlayPause={togglePlayPause}
          />
        )}
        
        <Conversation
          conversation={conversation}
          loading={loading}
          fontSize={fontSize}
          increaseFontSize={increaseFontSize}
          decreaseFontSize={decreaseFontSize}
          copyAnswerToClipboard={copyAnswerToClipboard}
        />
        
        <Footer
          isPremium={isPremium}
          handleSubscribe={handleSubscribe}
        />
      </main>
      
      <LoginModal
        showLoginModal={showLoginModal}
        setShowLoginModal={setShowLoginModal}
        handleLogin={handleLogin}
        handleSocialLogin={handleSocialLogin}
      />
      
      {copiedMessageVisible && (
        <div className="copy-notification">
          Copied to clipboard!
        </div>
      )}
    </div>
  );
}