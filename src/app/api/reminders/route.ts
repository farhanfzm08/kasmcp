import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { requireAdminSession, getAuthSession } from '@/src/lib/auth';
import { NotificationService } from '@/src/lib/notifications';

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const logs = await prisma.notificationLog.findMany({
      orderBy: { sentAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ logs });
  } catch (error: any) {
    return NextResponse.json({ error: 'Gagal mengambil log pengingat' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdminSession();
    const body = await request.json();
    const { type, obligationId, userId, periodId } = body;

    if (type === 'INDIVIDUAL') {
      let targetUserId = userId;

      if (!targetUserId && obligationId) {
        const ob = await prisma.paymentObligation.findUnique({
          where: { id: obligationId },
          select: { userId: true },
        });
        if (ob) targetUserId = ob.userId;
      }

      if (!targetUserId) {
        return NextResponse.json({ error: 'Pengguna / Tagihan tidak ditemukan' }, { status: 400 });
      }

      const res = await NotificationService.sendAccumulatedPaymentReminder({
        userId: targetUserId,
        adminId: admin.id,
        adminName: admin.name,
        targetPeriodId: periodId,
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: admin.id,
          npk: admin.npk,
          userName: admin.name,
          role: admin.role,
          activity: 'Kirim Reminder WhatsApp Rapel',
          details: `Admin mengirim pengingat akumulasi tunggakan kas ke pengguna dengan pesan WhatsApp Fonnte.`,
        },
      });

      return NextResponse.json({ success: true, result: res });
    } else if (type === 'BULK' || type === 'MASS') {
      const bulkRes = await NotificationService.sendBulkPaymentReminder(admin.id, admin.name, periodId);

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: admin.id,
          npk: admin.npk,
          userName: admin.name,
          role: admin.role,
          activity: 'Kirim Reminder WhatsApp Massal Rapel',
          details: `Admin mengirim reminder massal ke ${bulkRes.totalSent} anggota yang memiliki akumulasi tunggakan kas.`,
        },
      });

      return NextResponse.json({ success: true, bulkRes });
    } else {
      return NextResponse.json({ error: 'Tipe pengiriman tidak valid (Gunakan INDIVIDUAL, BULK, atau MASS)' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Send reminder error:', error);
    return NextResponse.json({ error: error.message || 'Gagal mengirim pengingat' }, { status: 500 });
  }
}
