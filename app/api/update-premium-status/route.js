import { NextResponse } from 'next/server';
import { initializeFirebaseAdmin } from '../../utils/firebaseAdmin';

// Route segment config
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // Changed from 'edge' to 'nodejs'

/**
 * Update premium status for a user
 * 
 * This endpoint updates a user's premium status in both Firebase Auth and Firestore
 */
export async function POST(request) {
  try {
    // Get request data
    const { email, isPremium = true, metadata = {} } = await request.json();
    
    if (!email) {
      return NextResponse.json({
        success: false,
        error: 'Email is required',
      }, { status: 400 });
    }
    
    console.log(`API: Updating premium status for ${email} to ${isPremium}`);
    
    // Initialize Firebase Admin
    const { auth, db } = initializeFirebaseAdmin('update-premium');
    
    if (!auth || !db) {
      console.error('Firebase initialization failed');
      return NextResponse.json({
        success: false,
        error: 'Service unavailable',
      }, { status: 503 });
    }
    
    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase();
    const timestamp = new Date().toISOString();
    
    // Create email key for Firestore (replacing dots and special chars)
    const emailKey = normalizedEmail.replace(/[.#$\/\[\]]/g, '_');
    
    // Update or create document in paid_emails collection first
    // This ensures we have a record of this email being premium
    try {
      await db.collection('paid_emails').doc(emailKey).set({
        email: normalizedEmail,
        isPremium,
        premiumSince: isPremium ? (metadata.premiumSince || timestamp) : null,
        subscriptionStatus: metadata.subscriptionStatus || (isPremium ? 'active' : 'canceled'),
        updatedAt: timestamp,
        // Additional fields
        registered: metadata.registered || false,
        source: metadata.source || 'api',
        updatedBy: metadata.updatedBy || 'update-premium-api'
      }, { merge: true });
      
      console.log(`Updated paid_emails record for ${normalizedEmail}`);
    } catch (paidEmailError) {
      console.error(`Error updating paid_emails for ${normalizedEmail}:`, paidEmailError);
      // Continue anyway, as the Auth update is more important
    }
    
    // Check if user exists in Firebase Auth
    let userRecord;
    let authUpdated = false;
    
    try {
      userRecord = await auth.getUserByEmail(normalizedEmail)
        .catch(() => null); // Catch "user not found" error and continue
      
      if (userRecord) {
        // User exists, update custom claims
        await auth.setCustomUserClaims(userRecord.uid, { 
          isPremium,
          updatedAt: timestamp,
          ...(isPremium ? { premiumSince: metadata.premiumSince || timestamp } : {})
        });
        
        authUpdated = true;
        console.log(`Updated Auth custom claims for ${normalizedEmail}`);
        
        // Also update Firestore user record if it exists
        try {
          await db.collection('users').doc(userRecord.uid).update({
            isPremium,
            updatedAt: timestamp,
            ...(isPremium ? { premiumSince: metadata.premiumSince || timestamp } : {})
          });
          
          console.log(`Updated Firestore user record for ${normalizedEmail}`);
        } catch (userUpdateError) {
          console.error(`Error updating user record for ${normalizedEmail}:`, userUpdateError);
          // Continue anyway as Auth claims are the source of truth
        }
      } else {
        console.log(`User ${normalizedEmail} not registered yet. Will be premium upon signup.`);
      }
    } catch (authError) {
      console.error(`Error updating Auth for ${normalizedEmail}:`, authError);
      // Continue anyway, as we still have the paid_emails record
    }
    
    // Return success, with some details about what was updated
    return NextResponse.json({
      success: true,
      email: normalizedEmail,
      isPremium,
      authUpdated,
      userExists: !!userRecord,
      timestamp
    });
  } catch (error) {
    console.error('Error in update-premium-status API:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 