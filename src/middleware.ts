import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/session';

export async function middleware(req: NextRequest) {
  const token = req.cookies.get('session')?.value;

  if (!token || !(await verifyToken(token))) {
    const loginUrl = new URL('/', req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/review/:path*'],
};
