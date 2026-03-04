import { db } from '@/lib/db';

export async function GET() {
  try {
    const schools = await db.school.findMany({
      include: { _count: { select: { images: true } } },
      orderBy: { name: 'asc' },
    });
    return Response.json(schools);
  } catch {
    return Response.json({ error: 'Failed to fetch schools' }, { status: 500 });
  }
}
