import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get("id");
  const externalUrl = searchParams.get("url");

  if (!fileId && !externalUrl) {
    return new NextResponse("File ID or URL required", { status: 400 });
  }

  const targetUrl = fileId
    ? `https://drive.usercontent.google.com/download?id=${fileId}&export=download`
    : externalUrl!;

  try {
    const upstreamRes = await fetch(targetUrl);

    if (!upstreamRes.ok) {
      return new NextResponse(`Failed to fetch from Drive: ${upstreamRes.statusText}`, { status: upstreamRes.status });
    }

    const headers = new Headers();
    headers.set("Content-Type", "application/pdf");
    headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    headers.set("Access-Control-Allow-Origin", "*");

    return new NextResponse(upstreamRes.body, {
      status: 200,
      headers,
    });
  } catch (err: any) {
    console.error("PDF Proxy Error:", err);
    return new NextResponse(`Error fetching PDF: ${err.message}`, { status: 500 });
  }
}
