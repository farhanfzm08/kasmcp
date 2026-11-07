import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { requireAdminSession, getAuthSession } from '@/src/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    const whereClause: any = {};

    if (category) {
      whereClause.category = category;
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        { adminName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (month && year) {
      const m = Number(month);
      const y = Number(year);
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0, 23, 59, 59);
      whereClause.date = { gte: start, lte: end };
    } else if (year) {
      const y = Number(year);
      const start = new Date(y, 0, 1);
      const end = new Date(y, 11, 31, 23, 59, 59);
      whereClause.date = { gte: start, lte: end };
    }

    const incomes = await prisma.incomeTransaction.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
    });

    return NextResponse.json({ incomes });
  } catch (error: any) {
    return NextResponse.json({ error: 'Gagal mengambil data pemasukan' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdminSession();
    const body = await request.json();

    const { title, category, amount, date, notes, proofUrl } = body;

    if (!title || !category || !amount) {
      return NextResponse.json({ error: 'Judul, Kategori, dan Nominal wajib diisi' }, { status: 400 });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'Nominal harus angka positif' }, { status: 400 });
    }

    const newIncome = await prisma.incomeTransaction.create({
      data: {
        date: date ? new Date(date) : new Date(),
        title: String(title).trim(),
        category: String(category).trim(),
        amount: numAmount,
        notes: notes ? String(notes).trim() : null,
        proofUrl: proofUrl ? String(proofUrl).trim() : null,
        adminId: admin.id,
        adminName: admin.name,
        isAutoPayment: false,
      },
    });

    // Ensure category is saved in IncomeCategory list for future select
    await prisma.incomeCategory.upsert({
      where: { name: newIncome.category },
      update: {},
      create: { name: newIncome.category },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        npk: admin.npk,
        userName: admin.name,
        role: admin.role,
        activity: 'Input Pemasukan Manual',
        details: `Admin mencatat pemasukan manual: "${newIncome.title}" (Kategori: ${newIncome.category}) sebesar Rp ${newIncome.amount.toLocaleString()}.`,
      },
    });

    return NextResponse.json({ success: true, income: newIncome });
  } catch (error: any) {
    console.error('Create income error:', error);
    return NextResponse.json({ error: error.message || 'Gagal menyimpan pemasukan' }, { status: 500 });
  }
}
