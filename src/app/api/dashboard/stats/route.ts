import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { getAuthSession } from '@/src/lib/auth';
import {
  ensureCurrentPeriodRollover,
  getPeriodForDate,
  getPeriodDateRange,
  formatPeriodLabel,
} from '@/src/lib/cash-service';

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Cached debounced check
    await ensureCurrentPeriodRollover();

    const now = new Date();
    const { month: currentMonth, year: currentYear } = getPeriodForDate(now);

    // Batch 1: Execute general aggregations and lookups in parallel
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);

    const [
      incomeAggregate,
      expenseAggregate,
      yearIncomeAgg,
      yearExpenseAgg,
      currentPeriod,
      activeMembersCount,
      recentIncomes,
      recentExpenses,
      allUnpaidObligations,
      allBenefitsExpenses,
      recentBenefitClaims,
    ] = await Promise.all([
      prisma.incomeTransaction.aggregate({ _sum: { amount: true } }),
      prisma.expenseTransaction.aggregate({ _sum: { amount: true } }),
      prisma.incomeTransaction.aggregate({
        where: { date: { gte: startOfYear, lte: endOfYear } },
        _sum: { amount: true },
      }),
      prisma.expenseTransaction.aggregate({
        where: { date: { gte: startOfYear, lte: endOfYear } },
        _sum: { amount: true },
      }),
      prisma.cashPeriod.findFirst({
        where: {
          month: currentMonth,
          year: currentYear,
        },
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
      prisma.expenseTransaction.findMany({
        where: { benefitTypeId: { not: null } },
        take: 4,
        orderBy: { date: 'desc' },
        select: {
          id: true,
          recipientName: true,
          benefitTypeName: true,
          amount: true,
          date: true,
          notes: true,
        },
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

    // Batch 2: Current period data in parallel (following 25th - 24th period rule)
    if (currentPeriod) {
      const { startDate: periodStart, endDate: periodEnd } = getPeriodDateRange(currentPeriod.month, currentPeriod.year);

      const [monthIncomeAgg, monthExpenseAgg, obligations, overdueAgg] = await Promise.all([
        prisma.incomeTransaction.aggregate({
          where: { date: { gte: periodStart, lte: periodEnd } },
          _sum: { amount: true },
        }),
        prisma.expenseTransaction.aggregate({
          where: { date: { gte: periodStart, lte: periodEnd } },
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

    // Batch 3: Parallel 6-period breakdown chart (25th to 24th cycles)
    const monthPromises = [];
    for (let i = 5; i >= 0; i--) {
      let m = currentMonth - i;
      let y = currentYear;
      while (m < 1) {
        m += 12;
        y -= 1;
      }
      const { startDate, endDate } = getPeriodDateRange(m, y);
      const monthName = new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(new Date(y, m - 1, 1));

      monthPromises.push(
        Promise.all([
          prisma.incomeTransaction.aggregate({
            where: { date: { gte: startDate, lte: endDate } },
            _sum: { amount: true },
          }),
          prisma.expenseTransaction.aggregate({
            where: { date: { gte: startDate, lte: endDate } },
            _sum: { amount: true },
          }),
        ]).then(([mInc, mExp]) => ({
          monthName,
          month: m,
          year: y,
          income: mInc._sum.amount || 0,
          expense: mExp._sum.amount || 0,
        }))
      );
    }
    const monthsData = await Promise.all(monthPromises);

    // Calculate Cash Runway based on average monthly expense
    const totalRecentExpenses = monthsData.reduce((sum, m) => sum + m.expense, 0);
    const avgMonthlyExpense = monthsData.length > 0 ? totalRecentExpenses / monthsData.length : 0;
    const runwayMonths = avgMonthlyExpense > 0 
      ? Math.round((currentBalance / avgMonthlyExpense) * 10) / 10 
      : (currentBalance > 0 ? 99 : 0);

    const severeDebtorsCount = Array.from(debtorMap.values()).filter((d) => d.unpaidMonthsCount >= 2).length;

    let daysUntilDue: number | null = null;
    if (currentPeriod?.dueDate) {
      const diffMs = new Date(currentPeriod.dueDate).getTime() - now.getTime();
      daysUntilDue = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    }

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
      currentPeriod: currentPeriod ? formatPeriodLabel(currentPeriod.month, currentPeriod.year) : 'Belum Ada Periode',
      periodDetails: currentPeriod,
      unpaidMembers,
      recentTransactions,
      monthsData,
      topDebtors,
      totalMembersWithArrears,
      severeDebtorsCount,
      daysUntilDue,
      runwayMonths,
      recentBenefitClaims,
      yearStats: {
        income: yearIncomeAgg._sum.amount || 0,
        expense: yearExpenseAgg._sum.amount || 0,
        balanceDiff: (yearIncomeAgg._sum.amount || 0) - (yearExpenseAgg._sum.amount || 0),
      },
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
