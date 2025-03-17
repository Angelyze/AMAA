import { NextResponse } from "next/server";

export async function GET(req) {
  const url = new URL(req.url);
  const redirectUrl = url.searchParams.get("url");
  
  if (!redirectUrl) {
    return NextResponse.json({ error: "No redirect URL provided" }, { status: 400 });
  }
  
  return NextResponse.redirect(redirectUrl);
}