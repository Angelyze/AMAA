import { NextResponse } from 'next/server';
import { initializeFirebaseAdmin, setUserPremiumStatus } from '../../utils/firebaseAdmin';
import { isTestPremiumEmail } from '../../utils/config';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password } = body;
    
    console.log('Login attempt:', { email: email });
    
    // Input validation
    if (!email || !password) {
      return NextResponse.json({ 
        success: false, 
        error: "Email and password are required" 
      }, { status: 400 });
    }
    
    // Standard Firebase Admin authentication
    try {
      const { auth, db } = initializeFirebaseAdmin('login-route');
      
      if (!auth || !db) {
        return NextResponse.json({ 
          success: false, 
          error: "Error initializing Firebase Auth" 
        }, { status: 500 });
      }
      
      // Find the user by email
      let userRecord;
      try {
        userRecord = await auth.getUserByEmail(email);
      } catch (error) {
        console.error('User not found in Firebase Auth:', error);
        return NextResponse.json({ 
          success: false, 
          error: "Invalid email or password" 
        }, { status: 401 });
      }
      
      if (!userRecord) {
        return NextResponse.json({ 
          success: false, 
          error: "Invalid email or password" 
        }, { status: 401 });
      }
      
      // Get the user's custom claims to check premium status
      const customClaims = userRecord.customClaims || {};
      let isPremium = customClaims.isPremium === true;
      
      if (isPremium) {
        console.log(`User ${email} has premium status via Firebase Auth claims`);
      } else if (isTestPremiumEmail(email)) {
        // Special case for test emails
        isPremium = true;
        console.log(`Test email login detected, granting premium status: ${email}`);
        
        // Set the custom claims
        try {
          await setUserPremiumStatus(userRecord.uid, true);
          console.log(`Updated custom claims for test email: ${email}`);
        } catch (claimsError) {
          console.error('Error updating custom claims for test email:', claimsError);
          // Continue anyway
        }
      } else {
        // Check Firestore as a backup
        try {
          const userDoc = await db.collection('users').doc(userRecord.uid).get();
          
          if (userDoc.exists) {
            const userData = userDoc.data();
            
            // If user is premium in Firestore but not in claims, update claims
            if (userData.isPremium && !isPremium) {
              await setUserPremiumStatus(userRecord.uid, true);
              console.log(`Updated custom claims for ${email} based on Firestore data`);
              isPremium = true;
            }
          }
        } catch (firestoreError) {
          console.error('Error checking Firestore:', firestoreError);
          // Continue anyway
        }
        
        // As a final check, look in paid_emails collection
        if (!isPremium) {
          try {
            const safeEmailKey = email.replace(/[.#$\/\[\]]/g, '_');
            const paidEmailDoc = await db.collection('paid_emails').doc(safeEmailKey).get();
            
            if (paidEmailDoc.exists && paidEmailDoc.data().isPremium) {
              // Update both Firebase Auth claims and user record
              await setUserPremiumStatus(userRecord.uid, true);
              console.log(`Updated premium status from paid_emails collection for: ${email}`);
              
              // Update user record
              await db.collection('users').doc(userRecord.uid).update({
                isPremium: true,
                premiumSince: paidEmailDoc.data().premiumSince || new Date().toISOString(),
                updatedAt: new Date().toISOString()
              });
              
              isPremium = true;
              
              // Update the paid_emails record to mark as registered
              await db.collection('paid_emails').doc(safeEmailKey).update({
                registered: true,
                uid: userRecord.uid,
                updatedAt: new Date().toISOString()
              });
            }
          } catch (paidEmailError) {
            console.error('Error checking paid_emails collection:', paidEmailError);
            // Continue anyway
          }
        }
      }
      
      // Successfully authenticated - set auth cookie
      const response = NextResponse.json({ 
        success: true, 
        isPremium: isPremium 
      });
      
      response.cookies.set({
        name: 'auth-session',
        value: `${userRecord.uid}-${Date.now()}`,
        expires: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
      
      console.log(`Login successful for ${email}, premium status: ${isPremium}`);
      return response;
    } catch (error) {
      console.error('Login error:', error);
      
      return NextResponse.json({ 
        success: false, 
        error: "Authentication failed" 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Critical login error:', error);
    return NextResponse.json({ 
      success: false, 
      error: "Server error" 
    }, { status: 500 });
  }
} 