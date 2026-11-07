import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { requireAdminSession } from '@/src/lib/auth';
import { ensureSpecificPeriod } from '@/src/lib/cash-service';
import { NotificationService } from '@/src/lib/notifications';

export async function POST(request: Request) {
  try {
    const admin = await requireAdminSession();
    const body = await request.json();

    const { userId, startMonth, startYear, monthsCount, paymentDate, notes } = body;

    if (!userId || !startMonth || !startYear || !monthsCount) {
      return NextResponse.json({ error: 'Data pelunasan multi-bulan tidak lengkap' }, { status: 400 });
    }

    const member = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!member) {
      return NextResponse.json({ error: 'Anggota tidak ditemukan' }, { status: 404 });
    }

    const payDate = paymentDate ? new Date(paymentDate) : new Date();
    const count = Number(monthsCount);
    let sMonth = Number(startMonth);
    let sYear = Number(startYear);

    const processedPeriods = [];
    let totalAmountPaid = 0;

    for (let i = 0; i < count; i++) {
      let targetMonth = sMonth + i;
      let targetYear = sYear;

      while (targetMonth > 12) {
        targetMonth -= 12;
        targetYear += 1;
      }

      // Ensure period exists
      const period = await ensureSpecificPeriod(targetMonth, targetYear);
      if (!period) continue;

      // Find member obligation
      let obligation = await prisma.paymentObligation.findFirst({
        where: {
          cashPeriodId: period.id,
          userId: member.id,
        },
      });

      if (!obligation) {
        // Create if missing
        obligation = await prisma.paymentObligation.create({
          data: {
            userId: member.id,
            cashPeriodId: period.id,
            amount: period.monthlyAmount || 50000,
            status: 'BELUM_BAYAR',
            dueDate: period.dueDate,
          },
        });
      }

      // If already paid, skip double payment
      if (obligation.status === 'SUDAH_BAYAR') {
        processedPeriods.push({
          title: period.title,
          status: 'SKIPPED_ALREADY_PAID',
          amount: obligation.amount,
        });
        continue;
      }

      // Mark paid
      await prisma.$transaction(async (tx) => {
        await tx.paymentObligation.update({
          where: { id: obligation.id },
          data: {
            status: 'SUDAH_BAYAR',
            paidAt: payDate,
            adminId: admin.id,
            adminName: admin.name,
            notes: notes || `Pelunasan multi-bulan (${count} bulan)`,
          },
        });

        const paymentTx = await tx.paymentTransaction.create({
          data: {
            obligationId: obligation.id,
            userId: member.id,
            cashPeriodId: period.id,
            amount: obligation.amount,
            paymentDate: payDate,
            adminId: admin.id,
            adminName: admin.name,
          },
        });

        await tx.incomeTransaction.create({
          data: {
            date: payDate,
            title: `Kas Bulanan - ${member.name} (${member.npk}) - ${period.title}`,
            category: 'Kas Bulanan Anggota',
            amount: obligation.amount,
            notes: notes || `Pelunasan kas sekaligus (${count} bulan Paket)`,
            adminId: admin.id,
            adminName: admin.name,
            paymentTransactionId: paymentTx.id,
            isAutoPayment: true,
          },
        });
      });

      totalAmountPaid += obligation.amount;
      processedPeriods.push({
        title: period.title,
        status: 'PAID',
        amount: obligation.amount,
      });
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        npk: admin.npk,
        userName: admin.name,
        role: admin.role,
        activity: 'Pelunasan Multi-Bulan Kas',
        details: `Admin memproses pelunasan ${count} bulan kas sekaligus untuk ${member.name} (${member.npk}) sebesar Rp ${totalAmountPaid.toLocaleString()}.`,
      },
    });

    // Send automated Fonnte WA payment receipt for multi-month payment
    try {
      const paidPeriodTitles = processedPeriods
        .filter((p) => p.status === 'PAID')
        .map((p) => p.title.replace('Kas Sosial ', ''))
        .join(', ');

      await NotificationService.sendPaymentConfirmation({
        recipientNpk: member.npk,
        recipientName: member.name,
        phone: member.phone,
        periodTitle: `Paket ${processedPeriods.filter((p) => p.status === 'PAID').length} Bulan (${paidPeriodTitles})`,
        amount: totalAmountPaid,
        paidAt: payDate,
        adminName: admin.name,
        notes: notes || `Pelunasan Kas Sekaligus (${count} Bulan)`,
      });
    } catch (notifErr) {
      console.warn('Failed to send multi-pay WhatsApp confirmation:', notifErr);
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil memproses pelunasan ${processedPeriods.filter((p) => p.status === 'PAID').length} periode kas untuk ${member.name}!`,
      totalAmountPaid,
      processedPeriods,
    });
  } catch (error: any) {
    console.error('Multi-pay error:', error);
    return NextResponse.json({ error: error.message || 'Gagal memproses pelunasan multi-bulan' }, { status: 500 });
  }
}

