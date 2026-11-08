import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { getAuthSession } from '@/src/lib/auth';
import { ensureCurrentPeriodRollover } from '@/src/lib/cash-service';

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Cached debounced check
    await ensureCurrentPeriodRollover();

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Batch 1: Execute general aggregations and lookups in parallel
    const [
      incomeAggregate,
      expenseAggregate,
      currentPeriod,
      activeMembersCount,
      recentIncomes,
      recentExpenses,
      allUnpaidObligations,
      allBenefitsExpenses,
    ] = await Promise.all([
      prisma.incomeTransaction.aggregate({ _sum: { amount: true } }),
      prisma.expenseTransaction.aggregate({ _sum: { amount: true } }),
      prisma.cashPeriod.findFirst({
        where: {
          isActive: true,
          OR: [
            { year: { lt: currentYear } },
            { year: currentYear, month: { lte: currentMonth } },
          ],
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      }),
      prisma.user.count({ where: { role: 'USER', isActive: true } }),
      prisma.incomeTransaction.findMany({ take: 5, orderBy: { date: 'desc' } }),
      prisma.expenseTransaction.findMany({ take: 5, orderBy: { date: 'desc' } }),
      prisma.paymentObligation.findMany({
        where: {
          status: { in: ['BELUM_BAYAR', 'TERLAMBAT'] },
          user: { isActive: true },
        },
        include: {
          user: { select: { id: true, npk: true, name: true, phone: true } },
          cashPeriod: { select: { title: true, month: true, year: true } },
        },
        orderBy: [
          { cashPeriod: { year: 'asc' } },
          { cashPeriod: { month: 'asc' } },
        ],
      }),
      prisma.expenseTransaction.findMany({
        where: { benefitTypeId: { not: null } },
        select: { amount: true, benefitTypeName: true },
      }),
    ]);

    const totalIncome = incomeAggregate._sum.amount || 0;
    const totalExpense = expenseAggregate._sum.amount || 0;
    const currentBalance = totalIncome - totalExpense;

    let incomeThisMonth = 0;
    let expenseThisMonth = 0;
    let paidCount = 0;
    let unpaidCount = 0;
    let totalOverdue = 0;
    let unpaidMembers: any[] = [];
    let progressPercentage = 0;

    // Batch 2: Current period data in parallel
    if (currentPeriod) {
      const firstDay = new Date(currentPeriod.year, currentPeriod.month - 1, 1);
      const lastDay = new Date(currentPeriod.year, currentPeriod.month, 0, 23, 59, 59);

      const [monthIncomeAgg, monthExpenseAgg, obligations, overdueAgg] = await Promise.all([
        prisma.incomeTransaction.aggregate({
          where: { date: { gte: firstDay, lte: lastDay } },
          _sum: { amount: true },
        }),
        prisma.expenseTransaction.aggregate({
          where: { date: { gte: firstDay, lte: lastDay } },
          _sum: { amount: true },
        }),
        prisma.paymentObligation.findMany({
          where: { cashPeriodId: currentPeriod.id },
          include: { user: true },
        }),
        prisma.paymentObligation.aggregate({
          where: { status: { in: ['BELUM_BAYAR', 'TERLAMBAT'] } },
          _sum: { amount: true },
        }),
      ]);

      incomeThisMonth = monthIncomeAgg._sum.amount || 0;
      expenseThisMonth = monthExpenseAgg._sum.amount || 0;
      totalOverdue = overdueAgg._sum.amount || 0;

      paidCount = obligations.filter((o) => o.status === 'SUDAH_BAYAR').length;
      unpaidCount = obligations.filter((o) => o.status === 'BELUM_BAYAR' || o.status === 'TERLAMBAT').length;

      const totalTarget = obligations.length * currentPeriod.monthlyAmount;
      const totalCollected = paidCount * currentPeriod.monthlyAmount;
      progressPercentage = totalTarget > 0 ? Math.round((totalCollected / totalTarget) * 100) : 0;

      unpaidMembers = obligations
        .filter((o) => o.status === 'BELUM_BAYAR' || o.status === 'TERLAMBAT')
        .map((o) => ({
          obligationId: o.id,
          userId: o.userId,
          npk: o.user.npk,
          name: o.user.name,
          phone: o.user.phone,
          status: o.status,
          amount: o.amount,
          dueDate: o.dueDate,
        }));
    }

    // Top 5 Members with Most Unpaid Obligations (Rapel Tertinggi)
    const debtorMap = new Map<string, {
      userId: string;
      npk: string;
      name: string;
      phone: string;
      totalUnpaidAmount: number;
      unpaidMonthsCount: number;
      unpaidPeriods: string[];
    }>();

    for (const ob of allUnpaidObligations) {
      const existing = debtorMap.get(ob.userId);
      const periodShort = ob.cashPeriod.title.replace('Kas Sosial ', '');
      if (existing) {
        existing.totalUnpaidAmount += ob.amount;
        existing.unpaidMonthsCount += 1;
        existing.unpaidPeriods.push(periodShort);
      } else {
        debtorMap.set(ob.userId, {
          userId: ob.userId,
          npk: ob.user.npk,
          name: ob.user.name,
          phone: ob.user.phone,
          totalUnpaidAmount: ob.amount,
          unpaidMonthsCount: 1,
          unpaidPeriods: [periodShort],
        });
      }
    }

    const topDebtors = Array.from(debtorMap.values())
      .sort((a, b) => b.totalUnpaidAmount - a.totalUnpaidAmount || b.unpaidMonthsCount - a.unpaidMonthsCount)
      .slice(0, 5);

    const totalMembersWithArrears = debtorMap.size;

    // Benefit (Santunan) Statistics Summary
    const totalBenefitAmount = allBenefitsExpenses.reduce((sum, b) => sum + b.amount, 0);
    const totalBenefitClaims = allBenefitsExpenses.length;
    const benefitTypeMap: Record<string, { count: number; total: number }> = {};
    for (const b of allBenefitsExpenses) {
      const key = b.benefitTypeName || 'Santunan Lainnya';
      if (!benefitTypeMap[key]) {
        benefitTypeMap[key] = { count: 0, total: 0 };
      }
      benefitTypeMap[key].count += 1;
      benefitTypeMap[key].total += b.amount;
    }
    const benefitBreakdown = Object.entries(benefitTypeMap).map(([name, data]) => ({
      name,
      count: data.count,
      total: data.total,
    }));

    // Merge & format recent transactions
    const recentTransactions = [
      ...recentIncomes.map((i) => ({
        id: `inc-${i.id}`,
        type: 'INCOME',
        date: i.date,
        title: i.title,
        category: i.category,
        amount: i.amount,
        adminName: i.adminName,
      })),
      ...recentExpenses.map((e) => ({
        id: `exp-${e.id}`,
        type: 'EXPENSE',
        date: e.date,
        title: e.benefitTypeName ? `Santunan: ${e.benefitTypeName}` : `Pengeluaran: ${e.recipientName}`,
        category: e.benefitTypeName || 'Pengeluaran',
        amount: e.amount,
        adminName: e.adminName,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 7);

    // Batch 3: Parallel 6-month breakdown chart
    const monthPromises = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0, 23, 59, 59);
      const monthName = new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(start);

      monthPromises.push(
        Promise.all([
          prisma.incomeTransaction.aggregate({
            where: { date: { gte: start, lte: end } },
            _sum: { amount: true },
          }),
          prisma.expenseTransaction.aggregate({
            where: { date: { gte: start, lte: end } },
            _sum: { amount: true },
          }),
        ]).then(([mInc, mExp]) => ({
          monthName,
          year: y,
          income: mInc._sum.amount || 0,
          expense: mExp._sum.amount || 0,
        }))
      );
    }
    const monthsData = await Promise.all(monthPromises);

    return NextResponse.json({
      currentBalance,
      totalIncome,
      totalExpense,
      incomeThisMonth,
      expenseThisMonth,
      activeMembersCount,
      paidCount,
      unpaidCount,
      totalOverdue,
      progressPercentage,
      currentPeriod: currentPeriod ? currentPeriod.title.replace('Kas Sosial ', '') : 'Belum Ada Periode',
      periodDetails: currentPeriod,
      unpaidMembers,
      recentTransactions,
      monthsData,
      topDebtors,
      totalMembersWithArrears,
      benefitSummary: {
        totalAmount: totalBenefitAmount,
        totalClaims: totalBenefitClaims,
        breakdown: benefitBreakdown,
      },
    });
  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data dashboard' }, { status: 500 });
  }
}
