import { createClient } from '@vercel/edge-config';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

async function setupEdgeConfig() {
  try {
    if (!process.env.EDGE_CONFIG) {
      console.error('EDGE_CONFIG environment variable is not set');
      return;
    }
    
    const client = createClient(process.env.EDGE_CONFIG);
    
    // Set initial premium users
    await client.set('premium_users', ['ahorva33@gmail.com']);
    
    console.log('Edge Config initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Edge Config:', error);
  }
}

setupEdgeConfig();