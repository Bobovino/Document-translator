/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Configure webpack for PDF.js
  webpack: (config, { isServer }) => {
    // Exclude PDF.js from server-side rendering
    if (isServer) {
      config.externals = [...(config.externals || []), 'pdfjs-dist'];
    }
    
    return config;
  },
  
  // Add CORS headers for PDF.js
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig;
