import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { getAuthSession } from '@/src/lib/auth';

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const categories = await prisma.incomeCategory.findMany({
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ categories });
  } catch (error: any) {
    return NextResponse.json({ error: 'Gagal mengambil kategori pemasukan' }, { status: 500 });
  }
}
