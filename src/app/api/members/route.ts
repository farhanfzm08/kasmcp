import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { requireAdminSession, getAuthSession } from '@/src/lib/auth';
import { normalizePhone } from '@/src/lib/format';

export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status'); // active | inactive | all

    const whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { npk: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status === 'active') {
      whereClause.isActive = true;
    } else if (status === 'inactive') {
      whereClause.isActive = false;
    }

    const members = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        npk: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        joinedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { npk: 'asc' },
    });

    return NextResponse.json({ members });
  } catch (error: any) {
    return NextResponse.json({ error: 'Gagal mengambil data anggota' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdminSession();
    const body = await request.json();

    const { npk, name, password, phone, role, joinedAt } = body;

    if (!npk || !name || !password || !phone) {
      return NextResponse.json({ error: 'NPK, Nama, Password, dan No. HP wajib diisi' }, { status: 400 });
    }

    const cleanNpk = String(npk).trim().toUpperCase();
    const formattedPhone = normalizePhone(phone);

    // Check unique NPK
    const existing = await prisma.user.findUnique({
      where: { npk: cleanNpk },
    });

    if (existing) {
      return NextResponse.json({ error: `NPK ${cleanNpk} sudah terdaftar dalam sistem.` }, { status: 400 });
    }

    const newUser = await prisma.user.create({
      data: {
        npk: cleanNpk,
        name: String(name).trim(),
        password: String(password).trim(),
        phone: formattedPhone,
        role: role === 'ADMIN' ? 'ADMIN' : 'USER',
        isActive: true,
        joinedAt: joinedAt ? new Date(joinedAt) : new Date(),
      },
    });

    // Auto-create obligation for active period if member is active USER
    if (newUser.role === 'USER') {
      const activePeriod = await prisma.cashPeriod.findFirst({
        where: { isActive: true },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      });

      if (activePeriod) {
        await prisma.paymentObligation.create({
          data: {
            userId: newUser.id,
            cashPeriodId: activePeriod.id,
            amount: activePeriod.monthlyAmount,
            status: 'BELUM_BAYAR',
            dueDate: activePeriod.dueDate,
          },
        });
      }
    }

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        npk: admin.npk,
        userName: admin.name,
        role: admin.role,
        activity: 'Tambah Anggota Baru',
        details: `Admin mendaftarkan anggota baru: ${newUser.name} (NPK: ${newUser.npk}, Phone: ${newUser.phone}).`,
      },
    });

    return NextResponse.json({ success: true, member: newUser });
  } catch (error: any) {
    console.error('Create member error:', error);
    return NextResponse.json({ error: error.message || 'Gagal menambahkan anggota' }, { status: 500 });
  }
}
