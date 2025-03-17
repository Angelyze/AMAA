import { NextResponse } from 'next/server';
import { verifyIdToken } from '../utils/firebaseAdmin';

/**
 * Middleware to verify Firebase ID tokens in API routes
 * @param {Request} request - The incoming request
 * @returns {Promise<Response>} - Either continues the request or returns an error
 */
export async function withAuth(request) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }
    
    // Extract the token
    const idToken = authHeader.split('Bearer ')[1];
    
    if (!idToken) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }
    
    // Verify the token
    const decodedToken = await verifyIdToken(idToken);
    
    if (!decodedToken) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    
    // Token is valid, continue with the request
    // We'll attach the user information to the request for use in the API route
    request.user = decodedToken;
    
    return null; // Continue with the request
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    return NextResponse.json(
      { error: 'Authentication error' },
      { status: 500 }
    );
  }
}

/**
 * Alternative middleware that checks for authentication via cookies
 * @param {Request} request - The incoming request
 * @returns {Promise<Response>} - Either continues the request or returns an error
 */
export async function withCookieAuth(request) {
  try {
    // Extract the auth cookie
    const cookies = request.cookies;
    const authCookie = cookies.get('auth-session');
    
    if (!authCookie || !authCookie.value) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Parse the cookie value (format: uid-timestamp)
    const [uid] = authCookie.value.split('-');
    
    if (!uid) {
      return NextResponse.json(
        { error: 'Invalid authentication cookie' },
        { status: 401 }
      );
    }
    
    // You could verify the user exists in Firebase here if needed
    // For now, we'll just attach the uid to the request
    request.user = { uid };
    
    return null; // Continue with the request
  } catch (error) {
    console.error('Cookie auth middleware error:', error);
    
    return NextResponse.json(
      { error: 'Authentication error' },
      { status: 500 }
    );
  }
}

/**
 * Middleware that checks if a user has premium status
 * @param {Request} request - The incoming request (should already have user attached)
 * @returns {Promise<Response>} - Either continues the request or returns an error
 */
export async function withPremium(request) {
  try {
    // This middleware should be used after withAuth or withCookieAuth
    if (!request.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Check if the user has premium status from the token claims
    const isPremium = request.user.isPremium === true;
    
    if (!isPremium) {
      return NextResponse.json(
        { error: 'Premium subscription required' },
        { status: 403 }
      );
    }
    
    return null; // Continue with the request
  } catch (error) {
    console.error('Premium middleware error:', error);
    
    return NextResponse.json(
      { error: 'Error checking premium status' },
      { status: 500 }
    );
  }
} 