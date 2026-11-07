import { redirect } from 'next/navigation';
import { getAuthSession } from '@/src/lib/auth';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const session = await getAuthSession();

  if (!session) {
    redirect('/login');
  }

  if (session.role === 'ADMIN') {
    redirect('/dashboard');
  } else {
    redirect('/user-dashboard');
  }
}
