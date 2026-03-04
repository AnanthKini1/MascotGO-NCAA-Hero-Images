import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/session', () => ({
  verifyToken: vi.fn(async (token: string) => {
    if (token === 'valid-token') return { email: 'user@example.com' };
    return null;
  }),
}));

import { middleware } from '@/middleware';

function makeReq(path: string, sessionValue?: string) {
  const url = `http://localhost${path}`;
  const headers: HeadersInit = sessionValue
    ? { cookie: `session=${sessionValue}` }
    : {};
  return new NextRequest(url, { headers });
}

describe('middleware', () => {
  it('redirects /review to / when no session cookie', async () => {
    const req = makeReq('/review');
    const res = await middleware(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost/');
  });

  it('redirects /review/anything to / when no session cookie', async () => {
    const req = makeReq('/review/some-school');
    const res = await middleware(req);

    expect(res.status).toBe(307);
  });

  it('allows /review through when session cookie holds a valid JWT', async () => {
    const req = makeReq('/review', 'valid-token');
    const res = await middleware(req);

    expect(res.status).toBe(200);
  });

  it('redirects /review when session cookie holds an invalid token', async () => {
    const req = makeReq('/review', 'tampered-token');
    const res = await middleware(req);

    expect(res.status).toBe(307);
  });

  it('redirects when called directly with no cookie (matcher excludes /api/* in prod)', async () => {
    const req = makeReq('/api/schools');
    const res = await middleware(req);
    expect(res.status).toBe(307);
  });
});
