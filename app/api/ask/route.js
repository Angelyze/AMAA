import { NextResponse } from 'next/server';

// Helper function to make XAI API request
async function makeXaiApiRequest(apiKey, formattedMessages) {
  const payload = {
    model: "grok-2-latest",
    messages: formattedMessages,
    temperature: 0.7,
    max_tokens: 1000
  };
  
  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload),
    timeout: 15000 // 15 second timeout
  });
  
  const responseText = await response.text();
  
  if (!response.ok) {
    throw new Error(`XAI API error: ${response.status} - ${responseText.substring(0, 200)}`);
  }
  
  const data = JSON.parse(responseText);
  return data.choices[0]?.message?.content || "Sorry, I couldn't generate a response.";
}

// Helper function to make Gemini API request
async function makeGeminiApiRequest(apiKey, formattedMessages, apiUrl) {
  // Convert messages from XAI format to Gemini format
  const parts = [];
  
  // Format the conversation history for Gemini
  for (const msg of formattedMessages) {
    parts.push({
      text: `${msg.role === 'user' ? 'User: ' : 'Assistant: '}${msg.content}`
    });
  }
  
  const payload = {
    contents: [
      {
        parts: parts
      }
    ],
    generationConfig: {
      temperature: 0.7,
      topK: 32,
      topP: 1,
      maxOutputTokens: 1000,
    }
  };
  
  const response = await fetch(`${apiUrl}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorData.substring(0, 200)}`);
  }
  
  const geminiResponse = await response.json();
  
  // Extract the text response from Gemini
  if (geminiResponse.candidates && 
      geminiResponse.candidates[0] && 
      geminiResponse.candidates[0].content &&
      geminiResponse.candidates[0].content.parts &&
      geminiResponse.candidates[0].content.parts[0]) {
    return geminiResponse.candidates[0].content.parts[0].text;
  }
  
  throw new Error("Invalid Gemini API response format");
}

export async function POST(request) {
  const startTime = Date.now();
  
  try {
    const { question, history } = await request.json();
    
    console.log(`Received question: "${question}"`);
    console.log(`Conversation history length: ${history?.length || 0}`);
    
    // Format the conversation history for API
    const formattedMessages = [];
    
    // Add history messages if they exist
    if (history && history.length > 0) {
      for (const msg of history) {
        formattedMessages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      }
    }
    
    // Make sure we have at least one message
    if (formattedMessages.length === 0) {
      formattedMessages.push({
        role: 'user',
        content: question
      });
    }
    
    // Try XAI APIs first (with all 3 keys)
    const xaiKeys = [
      process.env.XAI_API_KEY,
      process.env.XAI_API_KEY2,
      process.env.XAI_API_KEY3
    ];
    
    // Try Gemini API keys as fallback
    const geminiKeys = [
      process.env.GEMINI_API_KEY,
      process.env.GEMINI_API_KEY2,
      process.env.GEMINI_API_KEY3
    ];
    
    // Gemini API URLs to try
    const geminiUrls = [
      process.env.GEMINI_API_URL || "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      process.env.GEMINI_API_URL2 || "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
    ];
    
    // Try all XAI keys first
    for (let i = 0; i < xaiKeys.length; i++) {
      const apiKey = xaiKeys[i];
      if (!apiKey) continue;
      
      try {
        console.log(`Trying XAI API key ${i + 1}...`);
        const answer = await makeXaiApiRequest(apiKey, formattedMessages);
        
        // Ensure minimum response time to show loading indicator
        const responseTime = Date.now() - startTime;
        if (responseTime < 500) {
          await new Promise(resolve => setTimeout(resolve, 500 - responseTime));
        }
        
        return NextResponse.json({ answer });
      } catch (error) {
        console.error(`XAI API key ${i + 1} failed:`, error.message);
        // Continue to next key or API
      }
    }
    
    // If all XAI keys failed, try all Gemini key combinations
    console.log("All XAI API keys failed, falling back to Gemini...");
    
    for (const apiUrl of geminiUrls) {
      for (let i = 0; i < geminiKeys.length; i++) {
        const apiKey = geminiKeys[i];
        if (!apiKey) continue;
        
        try {
          console.log(`Trying Gemini API key ${i + 1} with URL: ${apiUrl}...`);
          const answer = await makeGeminiApiRequest(apiKey, formattedMessages, apiUrl);
          
          // Ensure minimum response time to show loading indicator
          const responseTime = Date.now() - startTime;
          if (responseTime < 500) {
            await new Promise(resolve => setTimeout(resolve, 500 - responseTime));
          }
          
          return NextResponse.json({ answer });
        } catch (error) {
          console.error(`Gemini API key ${i + 1} with URL ${apiUrl} failed:`, error.message);
          // Continue to next key or URL
        }
      }
    }
    
    // If we get here, all API attempts failed
    console.error("All API attempts failed");
    return NextResponse.json({ 
      answer: "I'm sorry, but I'm having trouble connecting to my knowledge base right now. Please try again in a few moments."
    });
    
  } catch (error) {
    console.error("Unexpected error in ask endpoint:", error);
    return NextResponse.json(
      { answer: "I'm sorry, but I encountered an unexpected error. Please try again later." },
      { status: 200 }
    );
  }
}