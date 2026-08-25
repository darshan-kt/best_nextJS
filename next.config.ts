import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // CLAUDE.md is this project's permanent, hand-authored governing
  // instructions file (see project root) — don't let Next.js append
  // auto-generated agent-rules content to it on every `next dev`.
  agentRules: false,
};

export default nextConfig;
