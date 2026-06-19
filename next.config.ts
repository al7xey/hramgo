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
  }
};

export default nextConfig;
