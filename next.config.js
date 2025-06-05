// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // If you ever need to expose a server‐side variable at build time without NEXT_PUBLIC_,
  // you can list it here. (Next.js automatically exposes NEXT_PUBLIC_*).
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY
  },

  // (Optional) If you plan to load images from external domains (e.g., YouTube thumbnails),
  // you can whitelist them here:
  images: {
    domains: [
      "i.ytimg.com",      // example for YouTube thumbnails
      "lh3.googleusercontent.com" // example for Google-hosted profile pics, etc.
    ]
  }
};

module.exports = nextConfig;
