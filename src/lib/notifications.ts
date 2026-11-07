import { prisma } from './prisma';
import { formatRupiah, normalizePhone, formatDateIndo } from './format';

export interface SendReminderParams {
  userId?: string;
  recipientNpk: string;
  recipientName: string;
  phone: string;
  periodTitle: string;
  amount: number;
  dueDate: string | Date;
  status: string;
  adminId: string;
  adminName: string;
}

export interface FonntePayload {
  target: string;
  message: string;
  url?: string;
}

export class NotificationService {
  /**
   * Get Fonnte settings from database or env variables
   */
  private static async getFonnteConfig() {
    const settings = await prisma.systemSetting.findMany({
      where: {
        key: {
          in: ['FONNTE_API_URL', 'fonnte_api_url', 'FONNTE_API_TOKEN', 'fonnte_api_token', 'reminder_template', 'WA_TEMPLATE_REMINDER'],
        },
      },
    });

    const settingsMap: Record<string, string> = {};
    settings.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    const apiUrl =
      process.env.FONNTE_API_URL ||
      settingsMap['FONNTE_API_URL'] ||
      settingsMap['fonnte_api_url'] ||
      'https://api.fonnte.com/send';

    const apiToken =
      process.env.FONNTE_API_TOKEN ||
      settingsMap['FONNTE_API_TOKEN'] ||
      settingsMap['fonnte_api_token'];

    return {
      apiUrl,
      apiToken: apiToken && apiToken.trim() !== '' ? apiToken.trim() : 'MOCK_FONNTE_TOKEN',
      template: settingsMap['WA_TEMPLATE_REMINDER'] || settingsMap['reminder_template'] || '',
    };
  }

  /**
   * Helper to send WhatsApp via Fonnte API or simulate
   */
  private static async dispatchFonnte(targetPhone: string, message: string) {
    const config = await this.getFonnteConfig();
    const formattedPhone = normalizePhone(targetPhone);

    const payload: FonntePayload = {
      target: formattedPhone,
      message,
    };

    let sendStatus = 'SIMULATED';

    if (config.apiToken && !config.apiToken.startsWith('MOCK_')) {
      try {
        const response = await fetch(config.apiUrl, {
          method: 'POST',
          headers: {
            Authorization: config.apiToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const resData = await response.json().catch(() => null);

        if (response.ok && (resData?.status === true || resData?.detail || resData?.id)) {
          sendStatus = 'SENT';
        } else {
          console.warn('Fonnte API send failed:', resData);
          sendStatus = 'FAILED';
        }
      } catch (err) {
        console.error('Fonnte API error:', err);
        sendStatus = 'FAILED';
      }
    }

    return { sendStatus, formattedPhone, payload };
  }

  /**
   * Send RAPEL Accumulated Payment Reminder for an individual user
   * Checks ALL past & current unpaid months for the member and sums them up!
   */
  static async sendAccumulatedPaymentReminder(params: {
    userId: string;
    adminId: string;
    adminName: string;
    targetPeriodId?: string;
  }) {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
    });

    if (!user) throw new Error('Anggota tidak ditemukan');

    // Query all unpaid obligations up to current date/period
    const unpaidObligations = await prisma.paymentObligation.findMany({
      where: {
        userId: user.id,
        status: { in: ['BELUM_BAYAR', 'TERLAMBAT'] },
      },
      include: {
        cashPeriod: true,
      },
      orderBy: [
        { cashPeriod: { year: 'asc' } },
        { cashPeriod: { month: 'asc' } },
      ],
    });

    if (unpaidObligations.length === 0) {
      return {
        success: true,
        message: `${user.name} sudah tidak memiliki tunggakan kas.`,
        totalSent: 0,
      };
    }

    const orgSetting = await prisma.systemSetting.findUnique({ where: { key: 'org_name' } });
    const orgName = orgSetting?.value || 'Measuring Center';

    const countMonths = unpaidObligations.length;
    const totalAmount = unpaidObligations.reduce((sum, ob) => sum + ob.amount, 0);

    const periodNames = unpaidObligations.map((ob) => ob.cashPeriod.title.replace('Kas Sosial ', '')).join(', ');
    const breakdownList = unpaidObligations
      .map((ob) => `• ${ob.cashPeriod.title.replace('Kas Sosial ', '')}: ${formatRupiah(ob.amount)}`)
      .join('\n');

    const message = `Yth. *${user.name}* (NPK: ${user.npk}),\n\n[PENGINGAT KAS SOSIAL ${orgName.toUpperCase()}]\n\nKami menginformasikan bahwa Anda memiliki tunggakan pembayaran Kas Sosial sebanyak *${countMonths} Bulan* (${periodNames}) dengan total akumulasi *${formatRupiah(totalAmount)}*.\n\nRincian Tunggakan:\n${breakdownList}\n\nMohon untuk dapat segera melakukan setoran atau transfer ke Bendahara Kas.\nAtas perhatian dan kerjasamanya, kami ucapkan terima kasih!`;

    const { sendStatus, formattedPhone } = await this.dispatchFonnte(user.phone, message);

    const log = await prisma.notificationLog.create({
      data: {
        recipientNpk: user.npk,
        recipientName: user.name,
        phoneNumber: formattedPhone,
        periodTitle: countMonths > 1 ? `Rapel ${countMonths} Bulan` : unpaidObligations[0].cashPeriod.title,
        amount: totalAmount,
        message,
        status: sendStatus,
        sentByAdminId: params.adminId,
        sentByAdminName: params.adminName,
      },
    });

    return {
      success: true,
      log,
      message,
      status: sendStatus,
      countMonths,
      totalAmount,
    };
  }

  /**
   * Send single payment reminder (Backward compatible abstraction)
   */
  static async sendPaymentReminder(params: SendReminderParams) {
    if (params.userId) {
      return this.sendAccumulatedPaymentReminder({
        userId: params.userId,
        adminId: params.adminId,
        adminName: params.adminName,
      });
    }

    const orgSetting = await prisma.systemSetting.findUnique({ where: { key: 'org_name' } });
    const orgName = orgSetting?.value || 'Measuring Center';

    const message = `Yth. *${params.recipientName}* (NPK: ${params.recipientNpk}),\n\n[PENGINGAT KAS SOSIAL ${orgName.toUpperCase()}]\n\nPengingat tagihan Kas Sosial periode *${params.periodTitle}* sebesar *${formatRupiah(params.amount)}*.\nStatus: *${params.status}*.\n\nMohon untuk dapat segera melakukan pembayaran. Terima kasih!`;

    const { sendStatus, formattedPhone } = await this.dispatchFonnte(params.phone, message);

    const log = await prisma.notificationLog.create({
      data: {
        recipientNpk: params.recipientNpk,
        recipientName: params.recipientName,
        phoneNumber: formattedPhone,
        periodTitle: params.periodTitle,
        amount: params.amount,
        message,
        status: sendStatus,
        sentByAdminId: params.adminId,
        sentByAdminName: params.adminName,
      },
    });

    return { success: true, log, status: sendStatus };
  }

  /**
   * Send bulk payment reminders with accumulated rapel check for ALL unpaid members
   */
  static async sendBulkPaymentReminder(adminId: string, adminName: string, periodId?: string) {
    // Find all users who have at least one unpaid obligation
    const usersWithUnpaid = await prisma.user.findMany({
      where: {
        isActive: true,
        obligations: {
          some: {
            status: { in: ['BELUM_BAYAR', 'TERLAMBAT'] },
          },
        },
      },
    });


    const results = [];
    for (const u of usersWithUnpaid) {
      try {
        const res = await this.sendAccumulatedPaymentReminder({
          userId: u.id,
          adminId,
          adminName,
          targetPeriodId: periodId,
        });
        results.push(res);
      } catch (err) {
        console.error(`Failed to send reminder to ${u.name}:`, err);
      }
    }

    return {
      totalSent: results.length,
      periodTitle: 'Semua Tunggakan Kas',
      results,
    };
  }

  /**
   * Send payment receipt / thank-you notification via WhatsApp Fonnte
   */
  static async sendPaymentConfirmation(params: {
    recipientNpk: string;
    recipientName: string;
    phone: string;
    periodTitle: string;
    amount: number;
    paidAt: Date;
    adminName: string;
    notes?: string;
  }) {
    const orgSetting = await prisma.systemSetting.findUnique({ where: { key: 'org_name' } });
    const orgName = orgSetting?.value || 'Measuring Center';

    const dateStr = formatDateIndo(params.paidAt);

    const message = `Yth. *${params.recipientName}* (NPK: ${params.recipientNpk}),\n\n*KWITANSI / BUKTI PEMBAYARAN KAS SOSIAL ${orgName.toUpperCase()}*\n\nTerima kasih! Pembayaran kas sosial Anda untuk periode *${params.periodTitle}* sebesar *${formatRupiah(params.amount)}* telah berhasil diterima & diverifikasi *LUNAS* pada tanggal ${dateStr}.\n\nKeterangan: ${params.notes || 'Pembayaran Terverifikasi Admin'}\nVerifikator: Admin (${params.adminName})\n\nSemoga menjadi keberkahan dan kebaikan untuk kita semua. Terima kasih atas partisipasinya!`;

    const { sendStatus, formattedPhone } = await this.dispatchFonnte(params.phone, message);

    const log = await prisma.notificationLog.create({
      data: {
        recipientNpk: params.recipientNpk,
        recipientName: params.recipientName,
        phoneNumber: formattedPhone,
        periodTitle: params.periodTitle,
        amount: params.amount,
        message,
        status: sendStatus,
        sentByAdminId: 'SYSTEM',
        sentByAdminName: params.adminName,
      },
    });

    return { success: true, log, message, status: sendStatus };
  }

  /**
   * Send broadcast announcement
   */
  static async sendAnnouncement(title: string, announcementMessage: string, adminId: string, adminName: string) {
    const activeUsers = await prisma.user.findMany({ where: { isActive: true } });
    const logs = [];

    for (const u of activeUsers) {
      const message = `*[PENGUMUMAN - KAS SOSIAL MEASURING CENTER]*\n\n*${title}*\n\n${announcementMessage}`;
      const { sendStatus, formattedPhone } = await this.dispatchFonnte(u.phone, message);

      const log = await prisma.notificationLog.create({
        data: {
          recipientNpk: u.npk,
          recipientName: u.name,
          phoneNumber: formattedPhone,
          periodTitle: 'PENGUMUMAN',
          amount: 0,
          message,
          status: sendStatus,
          sentByAdminId: adminId,
          sentByAdminName: adminName,
        },
      });
      logs.push(log);
    }

    return { totalSent: logs.length, logs };
  }
}
