import { NextResponse, type NextRequest } from "next/server";
import { PORTAL_ALLOWED_ROLES } from "./lib/portal/config";

const AUTH_COOKIE = "rre_auth_token";

type TokenPayload = {
  sub: string;
  role: string;
  roles: string[];
  email: string;
  iat: number;
  exp: number;
  policyVersion: number;
};

function decodeBase64Url(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 ? "=".repeat(4 - (normalized.length % 4)) : "";
  const base64 = normalized + padding;
  return atob(base64);
}

function toBase64Url(buffer: Uint8Array) {
  let binary = "";
  for (let index = 0; index < buffer.length; index += 1) {
    binary += String.fromCharCode(buffer[index]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sign(data: string) {
  const encoder = new TextEncoder();
  const secret = process.env.RBAC_JWT_SECRET;
  if (!secret) {
    return null;
  }
  const keyMaterial = encoder.encode(secret);
  const key = await crypto.subtle.importKey("raw", keyMaterial, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return toBase64Url(new Uint8Array(signature));
}

async function verifyTokenFromCookie(token: string) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [versionEncoded, payloadEncoded, signature] = parts;
  const version = decodeBase64Url(versionEncoded);
  if (version !== "v1") return null;
  const data = `${versionEncoded}.${payloadEncoded}`;
  const expectedSignature = await sign(data);
  if (!expectedSignature) return null;
  if (expectedSignature !== signature) return null;
  const payload = JSON.parse(decodeBase64Url(payloadEncoded)) as TokenPayload;
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (payload.exp < nowSeconds) return null;
  return payload;
}

function unauthorized(message: string) {
  return new NextResponse(message, { status: 401 });
}

function forbidden(message: string) {
  return new NextResponse(message, { status: 403 });
}

export async function middleware(request: NextRequest) {
  const { pathname, hostname } = request.nextUrl;

  if (hostname.includes("portal.") && pathname === "/") {
    const target = request.nextUrl.clone();
    target.pathname = "/portal/dashboard";
    return NextResponse.redirect(target);
  }

  if (!pathname.startsWith("/portal")) {
    return NextResponse.next();
  }

  if (pathname === "/portal/login") {
    const token = request.cookies.get(AUTH_COOKIE)?.value;
    if (!token) return NextResponse.next();
    const payload = await verifyTokenFromCookie(token);
    if (!payload) return NextResponse.next();
    if (payload.roles.some((role) => PORTAL_ALLOWED_ROLES.includes(role as any))) {
      const target = request.nextUrl.clone();
      target.pathname = "/portal/dashboard";
      return NextResponse.redirect(target);
    }
    return forbidden("Role is not authorized for portal");
  }

  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return unauthorized("Authentication required");
  const payload = await verifyTokenFromCookie(token);
  if (!payload) return unauthorized("Invalid or expired token");
  const hasRole = payload.roles.some((role) => PORTAL_ALLOWED_ROLES.includes(role as any));
  if (!hasRole) return forbidden("Role is not permitted for portal");

  return NextResponse.next();
}

export const config = {
  matcher: ["/portal/:path*"],
};
