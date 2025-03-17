import { NextResponse } from "next/server";
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
const initializeFirebaseAdmin = () => {
  try {
    const apps = getApps();
    
    if (apps.length === 0) {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      
      const app = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey
        })
      }, 'stripe-callback-app');
      
      return getFirestore(app);
    } else {
      return getFirestore();
    }
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    return null;
  }
};

export async function GET(req) {
  const url = new URL(req.url);
  const urlParams = new URLSearchParams(url.search);
  console.log("Stripe callback - URL Params:", Object.fromEntries(urlParams));

  if (urlParams.get("success") === "true") {
    const email = urlParams.get("email");
    if (email) {
      try {
        // Initialize Firebase
        const db = initializeFirebaseAdmin();
        if (db) {
          // Update the user's premium status in Firestore
          const normalizedEmail = email.toLowerCase();
          const safeEmailKey = normalizedEmail.replace(/[.#$\/\[\]]/g, '_');
          const timestamp = new Date().toISOString();
          
          // Update in paid_emails collection
          await db.collection('paid_emails').doc(safeEmailKey).set({
            email: normalizedEmail,
            isPremium: true,
            premiumSince: timestamp,
            updatedAt: timestamp
          }, { merge: true });
          
          console.log(`Added ${normalizedEmail} to paid_emails collection in Firebase`);
          
          // Check if user already exists in users collection
          const usersRef = db.collection('users');
          const userQuery = await usersRef.where('email', '==', normalizedEmail).get();
          
          if (!userQuery.empty) {
            // Update existing user
            const userDoc = userQuery.docs[0];
            await usersRef.doc(userDoc.id).update({
              isPremium: true,
              premiumSince: timestamp,
              updatedAt: timestamp
            });
            console.log(`Updated premium status for existing user ${normalizedEmail}`);
          }
        } else {
          console.error("Failed to initialize Firebase in Stripe callback");
        }
      } catch (error) {
        console.error("Firebase error in Stripe callback:", error);
      }
      
      // Redirect to sign in page with success message
      return NextResponse.redirect(new URL(`/auth/signin?premium=true&email=${encodeURIComponent(email)}`, req.url));
    }
  }
  
  console.log("Stripe callback - Failed to update premium status");
  return NextResponse.redirect(new URL("/?payment_failed=true", req.url));
}

export async function POST(req) {
  const url = new URL(req.url);
  const urlParams = new URLSearchParams(url.search);
  console.log("Stripe callback - POST URL Params:", Object.fromEntries(urlParams));

  if (urlParams.get("success") === "true") {
    const email = urlParams.get("email");
    if (email) {
      // We'll handle the premium status update through the webhook
      
      // Redirect to sign in page with success message
      return NextResponse.redirect(new URL(`/auth/signin?premium=true&email=${encodeURIComponent(email)}`, req.url));
    }
  }
  
  console.log("Stripe callback - Failed to update premium status");
  return NextResponse.redirect(new URL("/?payment_failed=true", req.url));
}