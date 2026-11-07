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
    const benefitTypeId = searchParams.get('benefitTypeId') || '';
    const recipientType = searchParams.get('recipientType') || '';
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    const whereClause: any = {};

    if (benefitTypeId) {
      whereClause.benefitTypeId = benefitTypeId;
    }

    if (recipientType) {
      whereClause.recipientType = recipientType;
    }

    if (search) {
      whereClause.OR = [
        { recipientName: { contains: search, mode: 'insensitive' } },
        { memberName: { contains: search, mode: 'insensitive' } },
        { benefitTypeName: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
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

    const expenses = await prisma.expenseTransaction.findMany({
      where: whereClause,
      include: {
        benefitType: true,
        member: {
          select: { id: true, npk: true, name: true, phone: true },
        },
      },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json({ expenses });
  } catch (error: any) {
    return NextResponse.json({ error: 'Gagal mengambil data pengeluaran' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdminSession();
    const body = await request.json();

    const {
      date,
      benefitTypeId,
      recipientType, // MEMBER, FAMILY, EXTERNAL
      recipientName,
      recipientRelationship,
      memberId,
      amount,
      notes,
      proofUrl,
    } = body;

    if (!recipientType || !recipientName || !amount) {
      return NextResponse.json(
        { error: 'Tipe Penerima, Nama Penerima, dan Nominal Pengeluaran wajib diisi' },
        { status: 400 }
      );
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'Nominal pengeluaran harus angka positif' }, { status: 400 });
    }

    // Check available balance dynamically
    const incomeAgg = await prisma.incomeTransaction.aggregate({ _sum: { amount: true } });
    const expenseAgg = await prisma.expenseTransaction.aggregate({ _sum: { amount: true } });
    const currentBalance = (incomeAgg._sum.amount || 0) - (expenseAgg._sum.amount || 0);

    if (numAmount > currentBalance) {
      return NextResponse.json(
        {
          error: `Saldo kas sosial tidak mencukupi. Saldo saat ini: Rp ${currentBalance.toLocaleString()}, Jumlah pengeluaran: Rp ${numAmount.toLocaleString()}.`,
        },
        { status: 400 }
      );
    }

    let benefitTypeName = null;
    if (benefitTypeId) {
      const bt = await prisma.benefitType.findUnique({ where: { id: benefitTypeId } });
      if (bt) benefitTypeName = bt.name;
    }

    let memberName = null;
    if (memberId) {
      const u = await prisma.user.findUnique({ where: { id: memberId } });
      if (u) memberName = u.name;
    }

    const newExpense = await prisma.expenseTransaction.create({
      data: {
        date: date ? new Date(date) : new Date(),
        benefitTypeId: benefitTypeId || null,
        benefitTypeName,
        recipientType: recipientType || 'MEMBER',
        recipientName: String(recipientName).trim(),
        recipientRelationship: recipientRelationship ? String(recipientRelationship).trim() : null,
        memberId: memberId || null,
        memberName,
        amount: numAmount,
        notes: notes ? String(notes).trim() : null,
        proofUrl: proofUrl ? String(proofUrl).trim() : null,
        adminId: admin.id,
        adminName: admin.name,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        npk: admin.npk,
        userName: admin.name,
        role: admin.role,
        activity: 'Input Pengeluaran / Santunan',
        details: `Admin mencatat pengeluaran/santunan: ${benefitTypeName || 'Pengeluaran Umum'} untuk ${newExpense.recipientName} (${newExpense.recipientType}) sebesar Rp ${newExpense.amount.toLocaleString()}.`,
      },
    });

    return NextResponse.json({ success: true, expense: newExpense });
  } catch (error: any) {
    console.error('Create expense error:', error);
    return NextResponse.json({ error: error.message || 'Gagal menyimpan pengeluaran' }, { status: 500 });
  }
}
