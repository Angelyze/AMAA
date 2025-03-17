/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.google.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.googleusercontent.com https://*.google.com https://*.googleapis.com https://*.gstatic.com; frame-src 'self'; connect-src 'self' https://*.google.com https://*.vercel.com https://api.openai.com https://*.huggingface.co https://api.anthropic.com https://api.x.ai https://generativelanguage.googleapis.com; font-src 'self'; media-src 'self' blob:; object-src 'none'; base-uri 'self';"
          }
        ]
      }
    ];
  },
  experimental: {
    // This helps with Stripe webhook verification by preserving the raw body
    serverComponentsExternalPackages: ['stripe'],
  },
  // Force Node.js version for serverless functions
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Apply specific webpack configurations for server-side code
      // This can help with compatibility issues
      config.optimization.minimize = false;
    }
    return config;
  }
}

export default nextConfig