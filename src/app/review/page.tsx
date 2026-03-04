import { getSession } from '@/lib/session';
import ReviewClient from './ReviewClient';

export default async function ReviewPage() {
  const session = await getSession();
  const userEmail = session?.email ?? '';

  return <ReviewClient userEmail={userEmail} />;
}
