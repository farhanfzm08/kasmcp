import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { getAuthSession } from '@/src/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type') || 'KAS_UTAMA'; // KAS_UTAMA, PEMASUKAN, PENGELUARAN, PEMBAYARAN_ANGGOTA, SANTUNAN
    const month = searchParams.get('month');
    const year = searchParams.get('year') || String(new Date().getFullYear());
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    let startDate: Date;
    let endDate: Date;

    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
      endDate.setHours(23, 59, 59, 999);
    } else if (month && year) {
      const m = Number(month);
      const y = Number(year);
      startDate = new Date(y, m - 1, 1);
      endDate = new Date(y, m, 0, 23, 59, 59);
    } else {
      const y = Number(year);
      startDate = new Date(y, 0, 1);
      endDate = new Date(y, 11, 31, 23, 59, 59);
    }

    // 1. Calculate Saldo Awal (all incomes minus expenses BEFORE startDate)
    const priorIncomeAgg = await prisma.incomeTransaction.aggregate({
      where: { date: { lt: startDate } },
      _sum: { amount: true },
    });
    const priorExpenseAgg = await prisma.expenseTransaction.aggregate({
      where: { date: { lt: startDate } },
      _sum: { amount: true },
    });

    const saldoAwal = (priorIncomeAgg._sum.amount || 0) - (priorExpenseAgg._sum.amount || 0);

    // 2. Fetch Period Incomes
    const incomes = await prisma.incomeTransaction.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      orderBy: { date: 'asc' },
    });

    const totalIncome = incomes.reduce((sum, item) => sum + item.amount, 0);

    // 3. Fetch Period Expenses
    const expenses = await prisma.expenseTransaction.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      include: { benefitType: true },
      orderBy: { date: 'asc' },
    });

    const totalExpense = expenses.reduce((sum, item) => sum + item.amount, 0);

    const saldoAkhir = saldoAwal + totalIncome - totalExpense;

    // 4. Grouped Summary Statistics
    const incomeByCategory: Record<string, number> = {};
    incomes.forEach((i) => {
      incomeByCategory[i.category] = (incomeByCategory[i.category] || 0) + i.amount;
    });

    const expenseByBenefit: Record<string, number> = {};
    expenses.forEach((e) => {
      const catName = e.benefitTypeName || 'Pengeluaran Umum';
      expenseByBenefit[catName] = (expenseByBenefit[catName] || 0) + e.amount;
    });

    // 5. Payment Obligations status for PEMBAYARAN_ANGGOTA report
    let memberPayments: any[] = [];
    if (reportType === 'PEMBAYARAN_ANGGOTA' || reportType === 'KAS_UTAMA') {
      memberPayments = await prisma.paymentObligation.findMany({
        where: {
          dueDate: { gte: startDate, lte: endDate },
        },
        include: {
          user: { select: { npk: true, name: true, phone: true } },
          cashPeriod: { select: { title: true, month: true, year: true } },
        },
        orderBy: [{ cashPeriod: { year: 'desc' } }, { user: { npk: 'asc' } }],
      });
    }

    return NextResponse.json({
      reportType,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      summary: {
        saldoAwal,
        totalIncome,
        totalExpense,
        saldoAkhir,
        incomeByCategory,
        expenseByBenefit,
      },
      incomes,
      expenses,
      memberPayments,
    });
  } catch (error: any) {
    console.error('Reports API error:', error);
    return NextResponse.json({ error: 'Gagal menyusun laporan kas' }, { status: 500 });
  }
}
