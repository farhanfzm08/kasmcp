import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { requireAdminSession } from '@/src/lib/auth';

export async function GET(request: Request) {
  try {
    await requireAdminSession();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    const whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { npk: { contains: search, mode: 'insensitive' } },
        { userName: { contains: search, mode: 'insensitive' } },
        { activity: { contains: search, mode: 'insensitive' } },
        { details: { contains: search, mode: 'insensitive' } },
      ];
    }

    const logs = await prisma.auditLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return NextResponse.json({ logs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal mengambil audit log' }, { status: 500 });
  }
}
