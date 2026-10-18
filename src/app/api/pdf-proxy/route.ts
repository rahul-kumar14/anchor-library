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
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!upstreamRes.ok) {
      return new NextResponse(`Failed to fetch from Drive: ${upstreamRes.statusText}`, { status: upstreamRes.status });
    }

    const contentType = upstreamRes.headers.get("content-type") || "";
    // If Drive returned HTML (e.g. rate limit, access prompt), do not claim it is PDF
    if (contentType.includes("text/html")) {
      const errText = await upstreamRes.text();
      console.warn("Drive returned HTML instead of PDF:", errText.slice(0, 200));
      return new NextResponse("Google Drive did not return a binary PDF stream.", { status: 502 });
    }

    const headers = new Headers();
    headers.set("Content-Type", "application/pdf");
    headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    headers.set("Access-Control-Allow-Origin", "*");
    const cl = upstreamRes.headers.get("content-length");
    if (cl) headers.set("Content-Length", cl);

    return new NextResponse(upstreamRes.body, {
      status: 200,
      headers,
    });
  } catch (err: any) {
    console.error("PDF Proxy Error:", err);
    return new NextResponse(`Error fetching PDF: ${err.message}`, { status: 500 });
  }
}

