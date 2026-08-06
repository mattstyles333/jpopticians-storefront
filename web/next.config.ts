import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@jpop/lens-set-core"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  output: "export",
  trailingSlash: true,
  distDir: "out",
};

export default nextConfig;