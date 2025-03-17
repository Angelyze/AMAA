// Set environment variables for Firebase SSL/TLS compatibility
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
process.env.GRPC_SSL_CIPHER_SUITES = 'HIGH+ECDSA';
process.env.NODE_OPTIONS = '--openssl-legacy-provider';

// Additional Firebase Auth specific settings
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '';
process.env.FIREBASE_AUTH_NO_CERT_CHECK = 'true';

// Import necessary modules using ES module syntax
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// Prepare the Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      // Parse the URL
      const parsedUrl = parse(req.url, true);
      
      // Let Next.js handle the request
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling request:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  }).listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
}); 