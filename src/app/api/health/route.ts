import { NextResponse } from "next/server";

import { prisma } from "@/db/client";
import { logger } from "@/lib/logger";

/**
 * Liveness/readiness probe (§29, §42) for a load balancer or orchestrator
 * to poll. Deliberately unauthenticated — a health check has to be
 * reachable before a request could carry credentials — and deliberately
 * minimal: the response never includes the underlying error, connection
 * string, or stack trace, only whether the database answered (§29).
 */
export async function GET(): Promise<Response> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    logger.error("health check failed", {
      message: error instanceof Error ? error.message : "unknown error",
    });
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
