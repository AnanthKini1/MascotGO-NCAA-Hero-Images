import { db } from '@/lib/db';
import { getSession } from '@/lib/session';
import { VoteType } from '@/generated/prisma/enums';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const userEmail = session.email;

    const body = await req.json();
    const { imageId, type } = body;

    if (!imageId || typeof imageId !== 'string') {
      return Response.json({ error: 'imageId is required' }, { status: 400 });
    }
    if (type !== VoteType.APPROVE && type !== VoteType.REJECT) {
      return Response.json(
        { error: 'type must be APPROVE or REJECT' },
        { status: 400 }
      );
    }

    const image = await db.image.findUnique({ where: { id: imageId } });
    if (!image) {
      return Response.json({ error: 'Image not found' }, { status: 404 });
    }

    const vote = await db.vote.upsert({
      where: { userEmail_imageId: { userEmail, imageId } },
      update: { type },
      create: { imageId, userEmail, type },
    });

    return Response.json(vote, { status: 200 });
  } catch {
    return Response.json({ error: 'Failed to record vote' }, { status: 500 });
  }
}
