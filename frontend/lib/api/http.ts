import { NextResponse } from "next/server";
import { AccessDeniedError } from "../rbac/policy";

export function unauthorized(message = "Authentication required") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = "Access denied") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function handleApiError(error: unknown) {
  if (error instanceof AccessDeniedError) {
    return forbidden(error.message);
  }
  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
}

