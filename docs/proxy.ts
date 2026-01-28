import { isMarkdownPreferred, rewritePath } from 'fumadocs-core/negotiation';
import { type NextRequest, NextResponse } from 'next/server';

const { rewrite: rewriteLLM } = rewritePath('/docs/*path', '/llms.mdx/*path');

export async function proxy(request: NextRequest) {
  const response = NextResponse.next();

  if (isMarkdownPreferred(request)) {
    const result = rewriteLLM(request.nextUrl.pathname);
    if (result) {
      return NextResponse.rewrite(new URL(result, request.nextUrl));
    }
  }

  return response;
}

export const config = {
  // Matcher ignoring `/_next/`, `/api/`, static assets, favicon, etc.
  matcher: ['/((?!sitemap.xml|api|_next/static|_next/image|favicon.ico).*)'],
};
