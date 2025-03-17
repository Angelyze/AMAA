import { NextResponse } from 'next/server';

export const config = {
  matcher: '/welcome'
};

export async function middleware() {
  try {
    // Return a simple greeting without using Edge Config
    return NextResponse.json({ 
      greeting: 'Welcome to AMAA - Ask Me Anything About', 
      success: true 
    });
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.json({ 
      error: 'Failed to process request', 
      message: error.message,
      success: false 
    }, { status: 500 });
  }
} 