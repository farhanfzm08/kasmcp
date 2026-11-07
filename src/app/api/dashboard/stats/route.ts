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

    await ensureCurrentPeriodRollover();

    // 1. Total Incomes & Expenses (Calculated atomic sum)
    const incomeAggregate = await prisma.incomeTransaction.aggregate({
      _sum: { amount: true },
    });
    const totalIncome = incomeAggregate._sum.amount || 0;

    const expenseAggregate = await prisma.expenseTransaction.aggregate({
      _sum: { amount: true },
    });
    const totalExpense = expenseAggregate._sum.amount || 0;

    const currentBalance = totalIncome - totalExpense;

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // 2. Current Active Period (Current month & year)
    const currentPeriod = await prisma.cashPeriod.findFirst({
      where: {
        isActive: true,
        OR: [
          { year: { lt: currentYear } },
          { year: currentYear, month: { lte: currentMonth } },
        ],
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    let incomeThisMonth = 0;
    let expenseThisMonth = 0;
    let paidCount = 0;
    let unpaidCount = 0;
    let totalOverdue = 0;
    let unpaidMembers: any[] = [];
    let progressPercentage = 0;

    if (currentPeriod) {
      // Current month date range
      const firstDay = new Date(currentPeriod.year, currentPeriod.month - 1, 1);
      const lastDay = new Date(currentPeriod.year, currentPeriod.month, 0, 23, 59, 59);

      const monthIncomeAgg = await prisma.incomeTransaction.aggregate({
        where: { date: { gte: firstDay, lte: lastDay } },
        _sum: { amount: true },
      });
      incomeThisMonth = monthIncomeAgg._sum.amount || 0;

      const monthExpenseAgg = await prisma.expenseTransaction.aggregate({
        where: { date: { gte: firstDay, lte: lastDay } },
        _sum: { amount: true },
      });
      expenseThisMonth = monthExpenseAgg._sum.amount || 0;

      // Obligations for current period
      const obligations = await prisma.paymentObligation.findMany({
        where: { cashPeriodId: currentPeriod.id },
        include: { user: true },
      });

      paidCount = obligations.filter((o) => o.status === 'SUDAH_BAYAR').length;
      unpaidCount = obligations.filter((o) => o.status === 'BELUM_BAYAR' || o.status === 'TERLAMBAT').length;

      const totalTarget = obligations.length * currentPeriod.monthlyAmount;
      const totalCollected = paidCount * currentPeriod.monthlyAmount;
      progressPercentage = totalTarget > 0 ? Math.round((totalCollected / totalTarget) * 100) : 0;

      // Unpaid list
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

      // Overdue aggregate (all unpaid/terlambat obligations in system)
      const overdueAgg = await prisma.paymentObligation.aggregate({
        where: { status: { in: ['BELUM_BAYAR', 'TERLAMBAT'] } },
        _sum: { amount: true },
      });
      totalOverdue = overdueAgg._sum.amount || 0;
    }

    // 3. Active Members Count
    const activeMembersCount = await prisma.user.count({
      where: { role: 'USER', isActive: true },
    });

    // 4. Recent Transactions (Incomes & Expenses combined)
    const recentIncomes = await prisma.incomeTransaction.findMany({
      take: 5,
      orderBy: { date: 'desc' },
    });

    const recentExpenses = await prisma.expenseTransaction.findMany({
      take: 5,
      orderBy: { date: 'desc' },
    });

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

    // 5. Monthly breakdown for chart (Last 6 months)
    const monthsData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0, 23, 59, 59);

      const mInc = await prisma.incomeTransaction.aggregate({
        where: { date: { gte: start, lte: end } },
        _sum: { amount: true },
      });
      const mExp = await prisma.expenseTransaction.aggregate({
        where: { date: { gte: start, lte: end } },
        _sum: { amount: true },
      });

      const monthName = new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(start);
      monthsData.push({
        monthName,
        year: y,
        income: mInc._sum.amount || 0,
        expense: mExp._sum.amount || 0,
      });
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
      currentPeriod: currentPeriod ? currentPeriod.title.replace('Kas Sosial ', '') : 'Belum Ada Periode',
      periodDetails: currentPeriod,
      unpaidMembers,
      recentTransactions,
      monthsData,
    });
  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data dashboard' }, { status: 500 });
  }
}
