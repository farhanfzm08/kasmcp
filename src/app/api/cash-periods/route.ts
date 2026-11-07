import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { requireAdminSession, getAuthSession } from '@/src/lib/auth';
import { ensureCurrentPeriodRollover } from '@/src/lib/cash-service';

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureCurrentPeriodRollover();

    const periods = await prisma.cashPeriod.findMany({
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      include: {
        _count: {
          select: { obligations: true },
        },
      },
    });

    return NextResponse.json({ periods });
  } catch (error: any) {
    return NextResponse.json({ error: 'Gagal mengambil data periode kas' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdminSession();
    const body = await request.json();
    const { month, year, title, monthlyAmount, cycleStartDay } = body;

    if (!month || !year) {
      return NextResponse.json({ error: 'Bulan dan Tahun wajib diisi' }, { status: 400 });
    }

    const m = Number(month);
    const y = Number(year);

    // Check if period already exists
    const existing = await prisma.cashPeriod.findFirst({
      where: { month: m, year: y },
    });

    if (existing) {
      return NextResponse.json({ error: `Periode kas untuk ${m}/${y} sudah ada.` }, { status: 400 });
    }

    const monthsIndo = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const periodTitle = title || `Kas Sosial ${monthsIndo[m - 1]} ${y}`;
    const startDay = cycleStartDay ? Number(cycleStartDay) : 25;
    let dueMonth = m + 1;
    let dueYear = y;
    if (dueMonth > 12) {
      dueMonth = 1;
      dueYear += 1;
    }
    const dueDate = new Date(dueYear, dueMonth - 1, 15, 23, 59, 59);
    const amount = monthlyAmount ? Number(monthlyAmount) : 50000;

    // Create new cash period
    const newPeriod = await prisma.cashPeriod.create({
      data: {
        month: m,
        year: y,
        title: periodTitle,
        cycleStartDay: startDay,
        dueDate,
        monthlyAmount: amount,
        isActive: true,
      },
    });

    // Generate payment obligations for all active USER members
    const activeUsers = await prisma.user.findMany({
      where: { role: 'USER', isActive: true },
    });

    let generatedCount = 0;
    for (const u of activeUsers) {
      await prisma.paymentObligation.create({
        data: {
          userId: u.id,
          cashPeriodId: newPeriod.id,
          amount,
          status: 'BELUM_BAYAR',
          dueDate,
        },
      });
      generatedCount++;
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        npk: admin.npk,
        userName: admin.name,
        role: admin.role,
        activity: 'Buat Siklus Tagihan Kas Baru',
        details: `Admin membuat periode ${newPeriod.title} (Jatuh tempo: ${dueDate.toISOString().split('T')[0]}, Nominal: Rp ${amount.toLocaleString()}) untuk ${generatedCount} anggota aktif.`,
      },
    });

    return NextResponse.json({ success: true, period: newPeriod, generatedCount });
  } catch (error: any) {
    console.error('Create period error:', error);
    return NextResponse.json({ error: error.message || 'Gagal membuat periode kas' }, { status: 500 });
  }
}
