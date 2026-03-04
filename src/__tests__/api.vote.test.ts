import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
  db: {
    image: {
      findUnique: vi.fn(),
    },
    vote: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock('@/lib/session', () => ({
  getSession: vi.fn(),
}));

import { POST } from '@/app/api/vote/route';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

const mockImage = { id: 'img1', schoolId: 's1' };
const mockVote = {
  id: 'vote1',
  imageId: 'img1',
  userEmail: 'test@example.com',
  type: 'APPROVE',
};

function makeReq(body: unknown) {
  return new Request('http://localhost/api/vote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/vote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSession).mockResolvedValue({ email: 'test@example.com' });
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const res = await POST(makeReq({ imageId: 'img1', type: 'APPROVE' }));

    expect(res.status).toBe(401);
  });

  it('records an APPROVE vote and returns 200', async () => {
    vi.mocked(db.image.findUnique).mockResolvedValue(mockImage as never);
    vi.mocked(db.vote.upsert).mockResolvedValue(mockVote as never);

    const res = await POST(makeReq({ imageId: 'img1', type: 'APPROVE' }));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.type).toBe('APPROVE');
  });

  it('records a REJECT vote', async () => {
    vi.mocked(db.image.findUnique).mockResolvedValue(mockImage as never);
    vi.mocked(db.vote.upsert).mockResolvedValue({ ...mockVote, type: 'REJECT' } as never);

    const res = await POST(makeReq({ imageId: 'img1', type: 'REJECT' }));

    expect(res.status).toBe(200);
  });

  it('returns 400 when imageId is missing', async () => {
    const res = await POST(makeReq({ type: 'APPROVE' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/imageId/i);
  });

  it('returns 400 when type is invalid', async () => {
    const res = await POST(makeReq({ imageId: 'img1', type: 'LIKE' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/APPROVE or REJECT/i);
  });

  it('returns 404 when image does not exist', async () => {
    vi.mocked(db.image.findUnique).mockResolvedValue(null);

    const res = await POST(makeReq({ imageId: 'bad-id', type: 'APPROVE' }));
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe('Image not found');
  });

  it('returns 500 when db throws', async () => {
    vi.mocked(db.image.findUnique).mockResolvedValue(mockImage as never);
    vi.mocked(db.vote.upsert).mockRejectedValue(new Error('DB error'));

    const res = await POST(makeReq({ imageId: 'img1', type: 'APPROVE' }));
    expect(res.status).toBe(500);
  });
});
