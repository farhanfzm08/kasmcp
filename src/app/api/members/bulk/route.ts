import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { requireAdminSession } from '@/src/lib/auth';
import { normalizePhone } from '@/src/lib/format';

export async function POST(request: Request) {
  try {
    const admin = await requireAdminSession();
    const body = await request.json();
    const { members } = body;

    if (!Array.isArray(members) || members.length === 0) {
      return NextResponse.json(
        { error: 'Format data tidak valid atau daftar anggota kosong' },
        { status: 400 }
      );
    }

    // Get all existing NPKs to avoid duplicates
    const existingUsers = await prisma.user.findMany({
      select: { npk: true },
    });
    const existingNpkSet = new Set(existingUsers.map((u) => u.npk.toUpperCase()));

    // Get active cash period for auto obligations
    const activePeriod = await prisma.cashPeriod.findFirst({
      where: { isActive: true },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    const toInsert = [];
    const skippedNpks = [];

    for (const m of members) {
      const npk = String(m.npk || '').trim().toUpperCase();
      const name = String(m.name || '').trim();
      const phone = String(m.phone || '').trim();
      const password = String(m.password || 'user123').trim() || 'user123';
      const role = String(m.role || 'USER').trim().toUpperCase() === 'ADMIN' ? 'ADMIN' : 'USER';
      const joinedAt = m.joinedAt ? new Date(m.joinedAt) : new Date();

      if (!npk || !name || !phone) {
        continue;
      }

      if (existingNpkSet.has(npk)) {
        skippedNpks.push(npk);
        continue;
      }

      // Mark as existing in set to avoid duplicates within the upload file itself
      existingNpkSet.add(npk);

      toInsert.push({
        npk,
        name,
        phone: normalizePhone(phone),
        password,
        role,
        isActive: true,
        joinedAt,
      });
    }

    if (toInsert.length === 0) {
      return NextResponse.json({
        success: false,
        error: skippedNpks.length > 0 
          ? `Semua NPK yang diupload sudah ada dalam sistem (${skippedNpks.join(', ')}).`
          : 'Tidak ada baris data yang valid untuk disimpan.',
        skippedCount: skippedNpks.length,
        insertedCount: 0,
      }, { status: 400 });
    }

    // Insert members one by one or createMany, and create obligations
    let insertedCount = 0;
    for (const data of toInsert) {
      const newUser = await prisma.user.create({ data });
      insertedCount++;

      if (newUser.role === 'USER' && activePeriod) {
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

    // Record Audit Log
    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        npk: admin.npk,
        userName: admin.name,
        role: admin.role,
        activity: 'Bulk Upload Anggota Baru',
        details: `Admin berhasil mengupload ${insertedCount} anggota baru secara massal. ${
          skippedNpks.length > 0 ? `(${skippedNpks.length} NPK dilewati karena sudah ada)` : ''
        }`,
      },
    });

    return NextResponse.json({
      success: true,
      insertedCount,
      skippedCount: skippedNpks.length,
      skippedNpks,
    });
  } catch (error: any) {
    console.error('Bulk upload members error:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal memproses bulk upload anggota' },
      { status: 500 }
    );
  }
}
