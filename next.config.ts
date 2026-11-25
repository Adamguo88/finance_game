import type { NextConfig } from 'next';
const config: NextConfig = { output: 'export', basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? '', trailingSlash: true, devIndicators: false, allowedDevOrigins: ['127.0.0.1'], images: { unoptimized: true } };
export default config;
