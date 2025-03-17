import { NextResponse } from 'next/server';

// This is a debug endpoint that will help diagnose API integration issues
// WARNING: Do not expose actual key values in production
export async function GET(request) {
  try {
    // Get API configuration
    const apiConfig = {
      xai: {
        keyExists: !!process.env.XAI_API_KEY,
        keyFormat: process.env.XAI_API_KEY ? (process.env.XAI_API_KEY.startsWith('xai-') ? 'Valid' : 'Invalid') : 'Missing',
      },
      gemini: {
        keyExists: !!process.env.GEMINI_API_KEY,
        keyFormat: process.env.GEMINI_API_KEY ? (process.env.GEMINI_API_KEY.startsWith('AIza') ? 'Valid' : 'Invalid') : 'Missing',
      },
      huggingFace: {
        keyExists: !!process.env.HUGGING_FACE_API_KEY,
        keyFormat: process.env.HUGGING_FACE_API_KEY ? (process.env.HUGGING_FACE_API_KEY.startsWith('hf_') ? 'Valid' : 'Invalid') : 'Missing',
      }
    };
    
    // Check connectivity to APIs
    const connectivity = {
      xai: 'Testing...',
      gemini: 'Testing...',
      huggingFace: 'Testing...'
    };
    
    // Test xAI connectivity
    if (apiConfig.xai.keyExists) {
      try {
        const xaiResponse = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.XAI_API_KEY}`
          },
          body: JSON.stringify({
            model: "grok-2-latest",
            messages: [{ role: 'user', content: 'Hello' }],
            temperature: 0.7,
            max_tokens: 5
          })
        });
        
        if (xaiResponse.ok) {
          connectivity.xai = 'Connected';
        } else {
          connectivity.xai = `Error: ${xaiResponse.status} ${xaiResponse.statusText}`;
        }
      } catch (error) {
        connectivity.xai = `Error: ${error.message}`;
      }
    }
    
    // Test Gemini connectivity
    if (apiConfig.gemini.keyExists) {
      try {
        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, 
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: "Hello" }
                  ]
                }
              ]
            })
          }
        );
        
        if (geminiResponse.ok) {
          connectivity.gemini = 'Connected';
        } else {
          connectivity.gemini = `Error: ${geminiResponse.status} ${geminiResponse.statusText}`;
        }
      } catch (error) {
        connectivity.gemini = `Error: ${error.message}`;
      }
    }
    
    // Test Hugging Face connectivity
    if (apiConfig.huggingFace.keyExists) {
      try {
        const hfResponse = await fetch(
          `https://api-inference.huggingface.co/models/facebook/mms-tts-eng`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.HUGGING_FACE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              inputs: "Hello world",
            }),
          }
        );
        
        if (hfResponse.ok) {
          connectivity.huggingFace = 'Connected';
        } else {
          connectivity.huggingFace = `Error: ${hfResponse.status} ${hfResponse.statusText}`;
        }
      } catch (error) {
        connectivity.huggingFace = `Error: ${error.message}`;
      }
    }
    
    // CSP Information
    const cspInfo = {
      configuredIn: "next.config.js",
      frameAllowed: ["googleads.g.doubleclick.net", "tpc.googlesyndication.com", "pagead2.googlesyndication.com"],
      connectAllowed: ["*.google.com", "*.vercel.com", "api.openai.com", "*.huggingface.co", "*.adtrafficquality.google", "api.anthropic.com", "api.x.ai", "generativelanguage.googleapis.com"],
    };
    
    return NextResponse.json({
      apiConfig,
      connectivity,
      cspInfo,
      environmentType: process.env.NODE_ENV || 'Unknown',
      serverTime: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json(
      { error: 'Error checking API configuration', message: error.message },
      { status: 500 }
    );
  }
} 