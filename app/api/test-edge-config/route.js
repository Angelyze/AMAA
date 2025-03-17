import { NextResponse } from 'next/server';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export async function GET() {
  try {
    console.log("Testing Firebase connection...");
    
    // Initialize Firebase Admin if not already initialized
    let db;
    
    if (getApps().length === 0) {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      
      const app = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey
        })
      });
      
      db = getFirestore(app);
    } else {
      db = getFirestore();
    }
    
    // Test connection by getting a document count
    const snapshot = await db.collection('users').limit(1).get();
    
    return NextResponse.json({ 
      success: true,
      status: 200,
      message: "Firebase connection successful",
      documentExists: !snapshot.empty
    });
  } catch (error) {
    console.error("Firebase test error:", error);
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
}