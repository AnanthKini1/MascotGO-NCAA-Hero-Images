import { NextResponse } from 'next/server';
import { createSession } from '@/lib/session';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'email is required' }, { status: 400 });
    }
    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'password is required' },
        { status: 400 }
      );
    }

    const reviewPassword = process.env.REVIEW_PASSWORD;
    if (!reviewPassword) {
      console.error('REVIEW_PASSWORD env var is not set');
      return NextResponse.json(
        { error: 'Server misconfiguration' },
        { status: 500 }
      );
    }

    if (password !== reviewPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ success: true, email });
    await createSession(email, response);
    return response;
  } catch {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
