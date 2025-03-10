// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow API routes to handle file uploads with increased body size limit
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Increase for larger CV files
    },
  },
  // Increase serverless function timeout for processing larger files
  serverRuntimeConfig: {
    timeout: 60, // 60 seconds
  },
};

module.exports = nextConfig;