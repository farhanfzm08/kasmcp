import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { requireAdminSession, getAuthSession } from '@/src/lib/auth';
import { NotificationService } from '@/src/lib/notifications';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const claim = await prisma.benefitClaim.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, npk: true, name: true, phone: true } },
        benefitType: true,
      },
    });

    if (!claim) {
      return NextResponse.json({ error: 'Data klaim santunan tidak ditemukan' }, { status: 404 });
    }

    if (session.role !== 'ADMIN' && claim.userId !== session.id) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    return NextResponse.json({ claim });
  } catch (error: any) {
    return NextResponse.json({ error: 'Gagal mengambil data klaim' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminSession();
    const { id } = await params;
    const body = await request.json();
    const { action, rejectionReason } = body; // action: 'APPROVE' | 'REJECT'

    const claim = await prisma.benefitClaim.findUnique({
      where: { id },
      include: {
        user: true,
        benefitType: true,
      },
    });

    if (!claim) {
      return NextResponse.json({ error: 'Pengajuan klaim santunan tidak ditemukan' }, { status: 404 });
    }

    if (claim.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Klaim ini sudah diproses sebelumnya dengan status ${claim.status}` },
        { status: 400 }
      );
    }

    if (action === 'APPROVE') {
      // 1. Atomically approve claim and record ExpenseTransaction
      const result = await prisma.$transaction(async (tx) => {
        const updatedClaim = await tx.benefitClaim.update({
          where: { id },
          data: {
            status: 'APPROVED',
            approvedByAdminId: admin.id,
            approvedByAdminName: admin.name,
            approvedAt: new Date(),
          },
        });

        const expense = await tx.expenseTransaction.create({
          data: {
            benefitTypeId: claim.benefitTypeId,
            benefitTypeName: claim.benefitTypeName || claim.benefitType.name,
            recipientType: claim.recipientType,
            recipientName: claim.recipientName,
            recipientRelationship: claim.recipientRelationship,
            memberId: claim.userId,
            memberName: claim.user.name,
            amount: claim.amount,
            notes: claim.description || `Pencairan klaim santunan ${claim.benefitTypeName}`,
            proofUrl: claim.proofUrl,
            adminId: admin.id,
            adminName: admin.name,
            date: new Date(),
          },
        });

        // Audit Log
        await tx.auditLog.create({
          data: {
            userId: admin.id,
            npk: admin.npk,
            userName: admin.name,
            role: admin.role,
            activity: 'Setujui Klaim Santunan & Pencairan Kas',
            details: `Admin ${admin.name} menyetujui klaim santunan ${claim.benefitTypeName} sebesar Rp ${claim.amount.toLocaleString('id-ID')} untuk ${claim.recipientName} (Anggota: ${claim.user.name} - NPK: ${claim.user.npk}).`,
          },
        });

        return { updatedClaim, expense };
      });

      // 2. Send automated WhatsApp notification to member
      try {
        await NotificationService.sendClaimStatusNotification({
          phone: claim.user.phone,
          npk: claim.user.npk,
          memberName: claim.user.name,
          benefitTypeName: claim.benefitTypeName || claim.benefitType.name,
          amount: claim.amount,
          isApproved: true,
          adminName: admin.name,
        });
      } catch (waErr) {
        console.warn('Failed to send WhatsApp claim approval notification:', waErr);
      }

      return NextResponse.json({
        success: true,
        message: 'Klaim santunan berhasil disetujui & dicatat ke pengeluaran kas',
        result,
      });
    } else if (action === 'REJECT') {
      const updatedClaim = await prisma.benefitClaim.update({
        where: { id },
        data: {
          status: 'REJECTED',
          approvedByAdminId: admin.id,
          approvedByAdminName: admin.name,
          approvedAt: new Date(),
          rejectionReason: rejectionReason || 'Tidak memenuhi kriteria',
        },
      });

      // Audit Log
      await prisma.auditLog.create({
        data: {
          userId: admin.id,
          npk: admin.npk,
          userName: admin.name,
          role: admin.role,
          activity: 'Tolak Klaim Santunan',
          details: `Admin ${admin.name} menolak klaim santunan ${claim.benefitTypeName} anggota ${claim.user.name} dengan alasan: ${rejectionReason || 'Tidak memenuhi kriteria'}.`,
        },
      });

      // Send WhatsApp notification
      try {
        await NotificationService.sendClaimStatusNotification({
          phone: claim.user.phone,
          npk: claim.user.npk,
          memberName: claim.user.name,
          benefitTypeName: claim.benefitTypeName || claim.benefitType.name,
          amount: claim.amount,
          isApproved: false,
          rejectionReason: rejectionReason || 'Tidak memenuhi kriteria',
          adminName: admin.name,
        });
      } catch (waErr) {
        console.warn('Failed to send WhatsApp claim rejection notification:', waErr);
      }

      return NextResponse.json({
        success: true,
        message: 'Klaim santunan telah ditolak',
        claim: updatedClaim,
      });
    } else {
      return NextResponse.json({ error: 'Aksi tidak valid (Gunakan APPROVE atau REJECT)' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Process claim error:', error);
    return NextResponse.json({ error: error.message || 'Gagal memproses klaim' }, { status: 500 });
  }
}
