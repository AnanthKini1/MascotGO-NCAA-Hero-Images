import { db } from '@/lib/db';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const school = await db.school.findUnique({
      where: { name: decodeURIComponent(name) },
      include: {
        images: {
          include: { votes: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!school) {
      return Response.json({ error: 'School not found' }, { status: 404 });
    }

    return Response.json(school);
  } catch {
    return Response.json({ error: 'Failed to fetch school' }, { status: 500 });
  }
}
