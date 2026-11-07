import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { getAuthSession } from '@/src/lib/auth';
import { ensureCurrentPeriodRollover } from '@/src/lib/cash-service';

export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureCurrentPeriodRollover();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const periodId = searchParams.get('periodId') || '';
    const status = searchParams.get('status') || ''; // BELUM_BAYAR, SUDAH_BAYAR, TERLAMBAT, DIKECUALIKAN
    const year = searchParams.get('year') || '';

    const whereClause: any = {};

    if (periodId) {
      whereClause.cashPeriodId = periodId;
    }

    if (status) {
      whereClause.status = status;
    }

    if (year) {
      whereClause.cashPeriod = { year: Number(year) };
    }

    if (search) {
      whereClause.user = {
        OR: [
          { npk: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const obligations = await prisma.paymentObligation.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, npk: true, name: true, phone: true, isActive: true },
        },
        cashPeriod: {
          select: { id: true, title: true, month: true, year: true, monthlyAmount: true, dueDate: true },
        },
        paymentTransaction: true,
      },
      orderBy: [
        { cashPeriod: { year: 'desc' } },
        { cashPeriod: { month: 'desc' } },
        { user: { npk: 'asc' } },
      ],
    });

    return NextResponse.json({ obligations });
  } catch (error: any) {
    console.error('Payments list error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data pembayaran kas' }, { status: 500 });
  }
}
