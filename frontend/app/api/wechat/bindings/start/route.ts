import { NextResponse } from "next/server";
import { requireSupplier } from "../../../../../lib/auth/roleGuard";
import { resolveWeChatRuntimeConfig } from "../../../../../lib/wechat/config";
import { startWeChatBindingFlow } from "../../../../../lib/wechat/verificationService";

export const runtime = "nodejs";

const BINDING_START_RATE_LIMIT = {
  maxAttemptsPerWindow: 5,
  windowMs: 60 * 60 * 1000,
};

const bindingStartAttempts = new Map<string, number>();

function getRateLimitKey(input: { supplierId: string; nowMs: number }) {
  const bucket = Math.floor(input.nowMs / BINDING_START_RATE_LIMIT.windowMs);
  return {
    bucket,
    key: `${input.supplierId}:${bucket}`,
  };
}

function pruneStaleRateLimitBuckets(activeBucket: number) {
  for (const key of bindingStartAttempts.keys()) {
    const bucketValue = Number.parseInt(key.split(":").pop() || "", 10);
    if (Number.isNaN(bucketValue) || bucketValue < activeBucket - 2) {
      bindingStartAttempts.delete(key);
    }
  }
}

function enforceBindingStartRateLimit(input: { supplierId: string; nowMs?: number }) {
  const nowMs = input.nowMs || Date.now();
  const { key, bucket } = getRateLimitKey({
    supplierId: input.supplierId,
    nowMs,
  });
  pruneStaleRateLimitBuckets(bucket);

  const currentCount = bindingStartAttempts.get(key) || 0;
  if (currentCount >= BINDING_START_RATE_LIMIT.maxAttemptsPerWindow) {
    const bucketEndMs = (bucket + 1) * BINDING_START_RATE_LIMIT.windowMs;
    const retryAfterSeconds = Math.max(1, Math.ceil((bucketEndMs - nowMs) / 1000));
    return {
      allowed: false as const,
      currentCount,
      retryAfterSeconds,
    };
  }

  bindingStartAttempts.set(key, currentCount + 1);
  return {
    allowed: true as const,
    currentCount: currentCount + 1,
    retryAfterSeconds: 0,
  };
}

export async function POST(request: Request) {
  const supplier = requireSupplier(request.headers);
  if (!supplier) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const runtimeConfig = resolveWeChatRuntimeConfig();
  if (!runtimeConfig.flags.extensionEnabled) {
    return NextResponse.json({ error: "WeChat extension disabled" }, { status: 404 });
  }

  const rateLimit = enforceBindingStartRateLimit({
    supplierId: supplier.actorId,
  });
  if (!rateLimit.allowed) {
    console.warn("[wechat][bindings.start] rate limit exceeded", {
      supplierId: supplier.actorId,
      maxAttemptsPerHour: BINDING_START_RATE_LIMIT.maxAttemptsPerWindow,
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    });
    return NextResponse.json(
      {
        error: "Rate limit exceeded",
        code: "WECHAT_BINDING_START_RATE_LIMITED",
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      }
    );
  }

  let payload: { verificationMethod?: "QR_LINK" | "OAUTH" | "MANUAL_REVIEW" } = {};
  try {
    payload = request.headers.get("content-type")?.includes("application/json") ? await request.json() : {};
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const started = await startWeChatBindingFlow({
    entityType: "SUPPLIER",
    entityId: supplier.actorId,
    actorRole: "supplier",
    actorId: supplier.actorId,
    verificationMethod: payload.verificationMethod || "QR_LINK",
  });

  return NextResponse.json({
    binding: {
      bindingId: started.bindingId,
      status: started.status,
      wechatAppId: started.wechatAppId,
      verificationTokenExpiresAt: started.verificationTokenExpiresAt,
    },
    verification: {
      verificationLink: started.verificationLink,
      verificationEventKey: started.verificationEventKey,
    },
  });
}
