import { NextResponse } from 'next/server';
import { getAuthSession } from '@/src/lib/auth';

export async function GET() {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({ user: session });
}
