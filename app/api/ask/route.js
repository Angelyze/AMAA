import { NextResponse } from 'next/server';

export async function POST(request) {
  const { question, history = [] } = await request.json();
  if (!question) {
    return NextResponse.json({ error: 'Question required' }, { status: 400 });
  }

  try {
    console.log('API key:', process.env.XAI_API_KEY ? 'Loaded' : 'Missing');
    
    // Prepare messages with history
    const messages = [
      { role: 'system', content: 'You are a helpful assistant.' },
      ...history,
      { role: 'user', content: question },
    ];
    
    const grokResponse = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
      },
      body: JSON.stringify({
        messages: messages,
        model: 'grok-2-latest',
        stream: false,
        temperature: 0,
      }),
    });
    const data = await grokResponse.json();
    console.log('Grok response:', data);
    const answer = data.choices?.[0]?.message?.content || 'No answer received';
    return NextResponse.json({ answer });
  } catch (error) {
    console.error('Fetch error:', error.message);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}