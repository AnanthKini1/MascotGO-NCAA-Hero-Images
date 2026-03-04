import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { POST as login } from '@/app/api/auth/login/route';
import { POST as logout } from '@/app/api/auth/logout/route';
import { GET as me } from '@/app/api/auth/me/route';

function makeLoginReq(body: unknown) {
  return new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    process.env.REVIEW_PASSWORD = 'secret123';
    // SESSION_SECRET must be at least 32 chars for HS256
    process.env.SESSION_SECRET = 'test-secret-that-is-long-enough-32chars!';
  });

  afterEach(() => {
    delete process.env.REVIEW_PASSWORD;
    delete process.env.SESSION_SECRET;
  });

  it('returns 200 and sets httpOnly JWT session cookie on correct password', async () => {
    const res = await login(makeLoginReq({ email: 'a@b.com', password: 'secret123' }));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.email).toBe('a@b.com');

    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain('session=');
    expect(setCookie).toContain('HttpOnly');
    // Cookie value is a JWT — base64url encoded header starts with eyJ
    const cookieValue = setCookie!.split('session=')[1].split(';')[0];
    expect(cookieValue).toMatch(/^eyJ/);
  });

  it('returns 401 on wrong password', async () => {
    const res = await login(makeLoginReq({ email: 'a@b.com', password: 'wrong' }));

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Invalid credentials');
  });

  it('returns 400 when email is missing', async () => {
    const res = await login(makeLoginReq({ password: 'secret123' }));

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/email/i);
  });

  it('returns 400 when password is missing', async () => {
    const res = await login(makeLoginReq({ email: 'a@b.com' }));

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/password/i);
  });

  it('returns 500 when REVIEW_PASSWORD env var is not set', async () => {
    delete process.env.REVIEW_PASSWORD;

    const res = await login(makeLoginReq({ email: 'a@b.com', password: 'any' }));

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/misconfiguration/i);
  });
});

describe('POST /api/auth/logout', () => {
  it('returns 200 and clears the session cookie', async () => {
    const res = await logout();

    expect(res.status).toBe(200);
    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toContain('session=');
    expect(setCookie).toContain('Max-Age=0');
  });
});

describe('GET /api/auth/me', () => {
  it('returns 401 when no valid session', async () => {
    const session = await import('@/lib/session');
    vi.spyOn(session, 'getSession').mockResolvedValueOnce(null);

    const res = await me();

    expect(res.status).toBe(401);
  });

  it('returns 200 with email when session is valid', async () => {
    const session = await import('@/lib/session');
    vi.spyOn(session, 'getSession').mockResolvedValueOnce({
      email: 'user@example.com',
    });

    const res = await me();

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.email).toBe('user@example.com');
  });
});
