import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { requireAuthSession } from '@/src/lib/auth';
import { ensureUpcomingPeriods, getPeriodForDate } from '@/src/lib/cash-service';

export async function GET() {
  try {
    const session = await requireAuthSession();

    // Ensure periods exist up to current active period
    await ensureUpcomingPeriods(0, 5);

    // 1. Member profile
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        npk: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        joinedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Anggota tidak ditemukan' }, { status: 404 });
    }

    const now = new Date();
    const { month: currentMonth, year: currentYear } = getPeriodForDate(now);

    // 2. Fetch ALL obligations for member (Past & Current Period ONLY, cut-off on 25th)
    const allUserObligations = await prisma.paymentObligation.findMany({
      where: { userId: user.id },
      include: {
        cashPeriod: { select: { id: true, title: true, month: true, year: true, monthlyAmount: true, dueDate: true } },
        paymentTransaction: true,
      },
      orderBy: [
        { cashPeriod: { year: 'desc' } },
        { cashPeriod: { month: 'desc' } },
      ],
    });

    // Strictly filter out future periods (e.g. Juli 2026 will only appear starting 25 Juli)
    const obligations = allUserObligations.filter((o) => {
      const pYear = o.cashPeriod.year;
      const pMonth = o.cashPeriod.month;
      if (pYear < currentYear) return true;
      if (pYear === currentYear && pMonth <= currentMonth) return true;
      return false;
    });

    const currentObligation = obligations.find(
      (o) => o.cashPeriod.month === currentMonth && o.cashPeriod.year === currentYear
    ) || null;

    const unpaidObligations = obligations.filter(
      (o) => o.status === 'BELUM_BAYAR' || o.status === 'TERLAMBAT'
    );

    const totalUnpaidAmount = unpaidObligations.reduce((sum, o) => sum + o.amount, 0);

    // 3. System Balance summary for member transparency
    const incomeAgg = await prisma.incomeTransaction.aggregate({ _sum: { amount: true } });
    const expenseAgg = await prisma.expenseTransaction.aggregate({ _sum: { amount: true } });
    const currentBalance = (incomeAgg._sum.amount || 0) - (expenseAgg._sum.amount || 0);

    // 4. Payment instructions setting
    const paymentMethodSetting = await prisma.systemSetting.findUnique({
      where: { key: 'PAYMENT_METHOD_INFO' },
    });

    const paymentMethodInfo =
      paymentMethodSetting?.value ||
      'Pembayaran Kas Sosial disetor tunai (CASH) langsung ke Bendahara Measuring Center / Transfer Bank';

    // 5. Benefit guidelines
    const benefitTypes = await prisma.benefitType.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    // 6. Personal notifications history
    const notifications = await prisma.notificationLog.findMany({
      where: { recipientNpk: user.npk },
      orderBy: { sentAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      user,
      currentObligation,
      unpaidObligations,
      totalUnpaidAmount,
      obligations,
      currentBalance,
      paymentMethodInfo,
      benefitTypes,
      notifications,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal mengambil data portal anggota' }, { status: 500 });
  }
}
