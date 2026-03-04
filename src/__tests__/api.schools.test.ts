import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock must be before import of the route
vi.mock('@/lib/db', () => ({
  db: {
    school: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

import { GET as getSchools } from '@/app/api/schools/route';
import { GET as getSchool } from '@/app/api/schools/[name]/route';
import { db } from '@/lib/db';

const mockSchools = [
  { id: '1', name: 'Alabama', createdAt: new Date(), _count: { images: 3 } },
  { id: '2', name: 'Auburn', createdAt: new Date(), _count: { images: 0 } },
];

const mockSchoolWithImages = {
  id: '1',
  name: 'Alabama',
  createdAt: new Date(),
  images: [
    {
      id: 'img1',
      schoolId: '1',
      sourceUrl: 'https://example.com/img1.jpg',
      thumbnailUrl: 'https://example.com/thumb1.jpg',
      blobUrl: null,
      width: 1920,
      height: 1080,
      azureScore: 0.95,
      status: 'PENDING',
      createdAt: new Date(),
      votes: [
        { id: 'v1', userEmail: 'a@b.com', type: 'APPROVE', imageId: 'img1' },
      ],
    },
  ],
};

describe('GET /api/schools', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 200 with list of schools', async () => {
    vi.mocked(db.school.findMany).mockResolvedValue(mockSchools as never);

    const res = await getSchools();

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(2);
    expect(data[0].name).toBe('Alabama');
  });

  it('returns 500 when db throws', async () => {
    vi.mocked(db.school.findMany).mockRejectedValue(new Error('DB error'));

    const res = await getSchools();

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });
});

describe('GET /api/schools/[name]', () => {
  beforeEach(() => vi.clearAllMocks());

  function makeReq(name: string) {
    return {
      _req: new Request(`http://localhost/api/schools/${name}`),
      params: Promise.resolve({ name }),
    };
  }

  it('returns 200 with school + images when found', async () => {
    vi.mocked(db.school.findUnique).mockResolvedValue(
      mockSchoolWithImages as never
    );

    const { _req, params } = makeReq('Alabama');
    const res = await getSchool(_req, { params });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe('Alabama');
    expect(data.images).toHaveLength(1);
    expect(data.images[0].votes).toHaveLength(1);
  });

  it('returns 404 when school not found', async () => {
    vi.mocked(db.school.findUnique).mockResolvedValue(null);

    const { _req, params } = makeReq('Unknown');
    const res = await getSchool(_req, { params });

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe('School not found');
  });

  it('decodes URL-encoded school names', async () => {
    vi.mocked(db.school.findUnique).mockResolvedValue(
      mockSchoolWithImages as never
    );

    const { _req, params } = makeReq('University%20of%20Alabama');
    await getSchool(_req, { params });

    expect(db.school.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { name: 'University of Alabama' },
      })
    );
  });

  it('returns 500 when db throws', async () => {
    vi.mocked(db.school.findUnique).mockRejectedValue(new Error('DB error'));

    const { _req, params } = makeReq('Alabama');
    const res = await getSchool(_req, { params });

    expect(res.status).toBe(500);
  });
});
