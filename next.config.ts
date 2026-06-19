import type { NextConfig } from "next";

const imageRemotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
  {
    protocol: "https",
    hostname: "images.unsplash.com"
  },
  {
    protocol: "https",
    hostname: "upload.wikimedia.org"
  },
  {
    protocol: "https",
    hostname: "hramgo.ru"
  }
];

if (process.env.NODE_ENV !== "production") {
  imageRemotePatterns.push({
    protocol: "http",
    hostname: "localhost"
  });
}

const nextConfig: NextConfig = {
  devIndicators: false,
  images: {
    remotePatterns: imageRemotePatterns
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.hramgo.ru" }],
        destination: "https://hramgo.ru/:path*",
        permanent: true
      }
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload"
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff"
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin"
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), payment=(self), geolocation=(self)"
          }
        ]
      },
      {
        source: "/favicon.ico",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=86400"
          }
        ]
      },
      {
        source: "/rss.xml",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400"
          }
        ]
      }
    ];
  }
};

export default nextConfig;
