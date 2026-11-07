import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { requireAdminSession, getAuthSession } from '@/src/lib/auth';

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const benefitTypes = await prisma.benefitType.findMany({
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ benefitTypes });
  } catch (error: any) {
    return NextResponse.json({ error: 'Gagal mengambil jenis santunan' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdminSession();
    const body = await request.json();

    const { name, description, defaultAmount, rules } = body;

    if (!name || !defaultAmount) {
      return NextResponse.json({ error: 'Nama santunan dan Nominal Default wajib diisi' }, { status: 400 });
    }

    const cleanName = String(name).trim();

    const existing = await prisma.benefitType.findUnique({
      where: { name: cleanName },
    });

    if (existing) {
      return NextResponse.json({ error: `Jenis santunan "${cleanName}" sudah ada.` }, { status: 400 });
    }

    const benefitType = await prisma.benefitType.create({
      data: {
        name: cleanName,
        description: description ? String(description).trim() : null,
        defaultAmount: Number(defaultAmount),
        rules: rules ? String(rules).trim() : null,
        isActive: true,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        npk: admin.npk,
        userName: admin.name,
        role: admin.role,
        activity: 'Tambah Jenis Santunan Baru',
        details: `Admin menambahkan jenis santunan baru: ${benefitType.name} (Nominal: Rp ${benefitType.defaultAmount.toLocaleString()}).`,
      },
    });

    return NextResponse.json({ success: true, benefitType });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal menambahkan jenis santunan' }, { status: 500 });
  }
}
