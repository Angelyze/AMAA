import { NextResponse } from 'next/server';

/**
 * API endpoint to test the Firebase private key format
 */
export async function GET() {
  try {
    // Get the private key from environment variables
    const privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
    
    // Check if key exists and has the correct format
    const keyExists = !!privateKey;
    const hasQuotes = privateKey.startsWith('"') && privateKey.endsWith('"');
    const hasBeginMarker = privateKey.includes('BEGIN PRIVATE KEY');
    const hasNewlines = privateKey.includes('\n');
    const hasEscapedNewlines = privateKey.includes('\\n');
    
    // Create a formatted version for testing
    let formattedKey = privateKey;
    
    // Remove quotes if present
    if (hasQuotes) {
      formattedKey = formattedKey.slice(1, -1);
    }
    
    // Replace escaped newlines with actual newlines
    if (!hasNewlines && hasEscapedNewlines) {
      formattedKey = formattedKey.replace(/\\n/g, '\n');
    }
    
    // Check the formatted key
    const formattedHasBeginMarker = formattedKey.includes('BEGIN PRIVATE KEY');
    const formattedHasNewlines = formattedKey.includes('\n');
    
    // Return diagnostic information (but not the actual key)
    return NextResponse.json({
      success: true,
      keyDiagnostics: {
        keyExists,
        keyLength: privateKey.length,
        hasQuotes,
        hasBeginMarker,
        hasNewlines,
        hasEscapedNewlines,
        firstChars: privateKey.substring(0, 10) + '...',
        lastChars: '...' + privateKey.substring(privateKey.length - 10),
      },
      formattedKeyDiagnostics: {
        keyLength: formattedKey.length,
        hasBeginMarker: formattedHasBeginMarker,
        hasNewlines: formattedHasNewlines,
        firstChars: formattedKey.substring(0, 10) + '...',
        lastChars: '...' + formattedKey.substring(formattedKey.length - 10),
      },
      // Test if environment variables are available
      envVars: {
        projectId: !!process.env.FIREBASE_PROJECT_ID,
        clientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
        stripeSecretKey: !!process.env.STRIPE_SECRET_KEY,
        stripeWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      }
    });
  } catch (error) {
    console.error('Error in test-key endpoint:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
} 