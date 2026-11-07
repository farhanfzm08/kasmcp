import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { requireAdminSession } from '@/src/lib/auth';
import { NotificationService } from '@/src/lib/notifications';

export async function POST(request: Request) {
  try {
    const admin = await requireAdminSession();
    const body = await request.json();

    const { obligationId, notes, paymentDate } = body;

    if (!obligationId) {
      return NextResponse.json({ error: 'ID Tagihan (obligationId) wajib diisi' }, { status: 400 });
    }

    // 1. Fetch obligation with user and period
    const obligation = await prisma.paymentObligation.findUnique({
      where: { id: obligationId },
      include: {
        user: true,
        cashPeriod: true,
        paymentTransaction: true,
      },
    });

    if (!obligation) {
      return NextResponse.json({ error: 'Tagihan tidak ditemukan' }, { status: 404 });
    }

    // Protection against double payment!
    if (obligation.status === 'SUDAH_BAYAR' || obligation.paymentTransaction) {
      return NextResponse.json(
        { error: 'Tagihan ini SUDAH DIBAYAR sebelumnya. Sistem mencegah pencatatan ganda.' },
        { status: 400 }
      );
    }

    const payDate = paymentDate ? new Date(paymentDate) : new Date();

    // 2. Perform atomic transaction update
    const result = await prisma.$transaction(async (tx) => {
      // Update obligation status
      const updatedObligation = await tx.paymentObligation.update({
        where: { id: obligationId },
        data: {
          status: 'SUDAH_BAYAR',
          paidAt: payDate,
          adminId: admin.id,
          adminName: admin.name,
          notes: notes || 'Pembayaran diverifikasi manual oleh Admin',
        },
      });

      // Create PaymentTransaction
      const paymentTx = await tx.paymentTransaction.create({
        data: {
          obligationId: obligation.id,
          userId: obligation.userId,
          cashPeriodId: obligation.cashPeriodId,
          amount: obligation.amount,
          paymentDate: payDate,
          adminId: admin.id,
          adminName: admin.name,
        },
      });

      // Create automatic IncomeTransaction record
      const incomeTx = await tx.incomeTransaction.create({
        data: {
          date: payDate,
          title: `Kas Bulanan - ${obligation.user.name} (${obligation.user.npk}) - ${obligation.cashPeriod.title}`,
          category: 'Kas Bulanan Anggota',
          amount: obligation.amount,
          notes: notes || `Pembayaran kas otomatis periode ${obligation.cashPeriod.title}`,
          adminId: admin.id,
          adminName: admin.name,
          paymentTransactionId: paymentTx.id,
          isAutoPayment: true,
        },
      });

      // Log audit
      await tx.auditLog.create({
        data: {
          userId: admin.id,
          npk: admin.npk,
          userName: admin.name,
          role: admin.role,
          activity: 'Tandai Sudah Bayar Kas',
          details: `Admin menandai tagihan kas ${obligation.cashPeriod.title} untuk ${obligation.user.name} (${obligation.user.npk}) sebesar Rp ${obligation.amount.toLocaleString()} sebagai SUDAH BAYAR.`,
        },
      });

      return { updatedObligation, paymentTx, incomeTx };
    });

    // 3. Send automated confirmation notification via WhatsApp service abstraction
    try {
      await NotificationService.sendPaymentConfirmation({
        recipientNpk: obligation.user.npk,
        recipientName: obligation.user.name,
        phone: obligation.user.phone,
        periodTitle: obligation.cashPeriod.title,
        amount: obligation.amount,
        paidAt: payDate,
        adminName: admin.name,
      });
    } catch (notifErr) {
      console.warn('Failed to send WhatsApp confirmation:', notifErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Pembayaran kas berhasil ditandai sebagai SUDAH BAYAR dan transaksi pemasukan telah dicatat.',
      data: result,
    });
  } catch (error: any) {
    console.error('Mark paid error:', error);
    return NextResponse.json({ error: error.message || 'Gagal mengubah status pembayaran' }, { status: 500 });
  }
}
