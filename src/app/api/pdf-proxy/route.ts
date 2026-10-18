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
    const upstreamRes = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!upstreamRes.ok) {
      return new NextResponse(`Failed to fetch upstream PDF: ${upstreamRes.statusText}`, { status: upstreamRes.status });
    }

    const contentType = upstreamRes.headers.get("content-type") || "";
    // If Google returned an HTML error page rather than binary stream, report error
    if (contentType.includes("text/html")) {
      return new NextResponse("Stream not ready or blocked by Drive permissions", { status: 403 });
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
