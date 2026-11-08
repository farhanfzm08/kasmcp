import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { getAuthSession, requireAuthSession } from '@/src/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: any = {};
    if (session.role !== 'ADMIN') {
      where.userId = session.id;
    }
    if (status) {
      where.status = status;
    }

    const claims = await prisma.benefitClaim.findMany({
      where,
      include: {
        user: { select: { id: true, npk: true, name: true, phone: true } },
        benefitType: { select: { id: true, name: true, defaultAmount: true, rules: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const pendingCount = session.role === 'ADMIN'
      ? await prisma.benefitClaim.count({ where: { status: 'PENDING' } })
      : await prisma.benefitClaim.count({ where: { userId: session.id, status: 'PENDING' } });

    return NextResponse.json({ claims, pendingCount });
  } catch (error: any) {
    console.error('Fetch claims error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data klaim santunan' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuthSession();
    const body = await request.json();

    const {
      benefitTypeId,
      recipientType = 'MEMBER',
      recipientName,
      recipientRelationship = 'Diri Sendiri',
      eventDate,
      amount,
      description,
      proofUrl,
    } = body;

    if (!benefitTypeId || !recipientName || !amount) {
      return NextResponse.json(
        { error: 'Jenis santunan, nama penerima, dan nominal wajib diisi' },
        { status: 400 }
      );
    }

    const benefitType = await prisma.benefitType.findUnique({
      where: { id: benefitTypeId },
    });

    if (!benefitType) {
      return NextResponse.json({ error: 'Jenis santunan tidak ditemukan' }, { status: 404 });
    }

    const claim = await prisma.benefitClaim.create({
      data: {
        userId: session.id,
        benefitTypeId: benefitType.id,
        benefitTypeName: benefitType.name,
        recipientType,
        recipientName,
        recipientRelationship,
        eventDate: eventDate ? new Date(eventDate) : new Date(),
        amount: Number(amount),
        description,
        proofUrl,
        status: 'PENDING',
      },
      include: {
        user: { select: { name: true, npk: true } },
        benefitType: { select: { name: true } },
      },
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId: session.id,
        npk: session.npk,
        userName: session.name,
        role: session.role,
        activity: 'Pengajuan Klaim Santunan',
        details: `Anggota ${session.name} mengajukan klaim santunan ${benefitType.name} sebesar Rp ${Number(amount).toLocaleString('id-ID')} untuk ${recipientName}.`,
      },
    });

    return NextResponse.json({ success: true, claim });
  } catch (error: any) {
    console.error('Create claim error:', error);
    return NextResponse.json({ error: error.message || 'Gagal mengajukan santunan' }, { status: 500 });
  }
}
