import { NextResponse } from 'next/server';

// Helper function to make Gemini API request with file data
async function makeGeminiApiRequest(apiKey, parts, apiUrl) {
  const payload = {
    contents: [
      {
        parts: parts
      }
    ],
    generationConfig: {
      temperature: 0.4,
      topK: 32,
      topP: 1,
      maxOutputTokens: 2048,
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
  try {
    const { question, history, fileData } = await request.json();
    
    if (!fileData) {
      return NextResponse.json(
        { error: 'No file data provided' },
        { status: 400 }
      );
    }

    console.log("Processing file:", fileData.name);
    console.log("Question:", question);
    
    // Get Gemini API keys
    const geminiKeys = [
      process.env.GEMINI_API_KEY,
      process.env.GEMINI_API_KEY2,
      process.env.GEMINI_API_KEY3
    ];
    
    // Check if any API keys are available
    if (!geminiKeys.some(key => key)) {
      console.error("No Gemini API keys found in environment variables");
      return NextResponse.json(
        { answer: 'I cannot analyze this file right now. Please try again later.' },
        { status: 200 }
      );
    }
    
    // Gemini API URLs to try
    const geminiUrls = [
      process.env.GEMINI_API_URL || "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      process.env.GEMINI_API_URL2 || "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
    ];
    
    // Construct the parts array for Gemini API
    const parts = [];
    
    // Add conversation history as text parts
    if (history && history.length > 0) {
      // Convert history to format Gemini expects
      for (const msg of history) {
        if (msg.role === 'user') {
          parts.push({
            text: `User: ${msg.content}`
          });
        } else if (msg.role === 'assistant') {
          parts.push({
            text: `Assistant: ${msg.content}`
          });
        }
      }
    }
    
    // Add the file data as an inline data part
    if (fileData.data) {
      try {
        // Extract the base64 part of the data URL
        const base64Data = fileData.data.split(',')[1];
        const mimeType = fileData.type;
        
        parts.push({
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        });
      } catch (fileError) {
        console.error("Error processing file data:", fileError);
        return NextResponse.json(
          { answer: 'I had trouble processing this file. It may be corrupted or in an unsupported format.' },
          { status: 200 }
        );
      }
    }
    
    // Add the current question as the final text part
    parts.push({
      text: `The user has uploaded a file named "${fileData.name}" and asks: "${question}". Please analyze this file according to the user's request.`
    });
    
    // Try all combinations of Gemini API keys and URLs
    for (const apiUrl of geminiUrls) {
      for (let i = 0; i < geminiKeys.length; i++) {
        const apiKey = geminiKeys[i];
        if (!apiKey) continue;
        
        try {
          console.log(`Trying Gemini API key ${i + 1} with URL: ${apiUrl}...`);
          const answer = await makeGeminiApiRequest(apiKey, parts, apiUrl);
          
          return NextResponse.json({ 
            success: true, 
            answer: answer
          });
        } catch (error) {
          console.error(`Gemini API key ${i + 1} with URL ${apiUrl} failed:`, error.message);
          // Continue to next key or URL
        }
      }
    }
    
    // If all API attempts failed
    console.error("All Gemini API attempts failed");
    return NextResponse.json({ 
      success: false, 
      answer: "I'm sorry, but I'm having trouble analyzing this file right now. Please try again in a few moments."
    });
    
  } catch (error) {
    console.error('Error in analyze endpoint:', error);
    return NextResponse.json(
      { answer: 'There was a problem analyzing your file. Please try again.' },
      { status: 200 }
    );
  }
} 