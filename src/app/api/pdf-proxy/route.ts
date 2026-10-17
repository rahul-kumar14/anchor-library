import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get("id");

  if (!fileId) {
    return new NextResponse("File ID required", { status: 400 });
  }

  const driveDownloadUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download`;
  const rangeHeader = request.headers.get("range");

  try {
    const upstreamHeaders: Record<string, string> = {};
    if (rangeHeader) {
      upstreamHeaders["Range"] = rangeHeader;
    }

    const upstreamRes = await fetch(driveDownloadUrl, {
      headers: upstreamHeaders,
    });

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      return new NextResponse(`Failed to fetch from Drive: ${upstreamRes.statusText}`, { status: upstreamRes.status });
    }

    const headers = new Headers();
    headers.set("Content-Type", "application/pdf");
    headers.set("Accept-Ranges", "bytes");
    headers.set("Cache-Control", "public, max-age=604800, stale-while-revalidate=86400");
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Headers", "Range, Authorization, Content-Type");
    headers.set("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges");

    // Forward range and content headers from Google Drive
    const contentRange = upstreamRes.headers.get("content-range");
    const contentLength = upstreamRes.headers.get("content-length");
    if (contentRange) headers.set("Content-Range", contentRange);
    if (contentLength) headers.set("Content-Length", contentLength);

    return new NextResponse(upstreamRes.body, {
      status: upstreamRes.status,
      headers,
    });
  } catch (err: any) {
    console.error("PDF Proxy Error:", err);
    return new NextResponse(`Error fetching PDF: ${err.message}`, { status: 500 });
  }
}
