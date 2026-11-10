import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { NotificationService } from '@/src/lib/notifications';
import { ensureCurrentPeriodRollover } from '@/src/lib/cash-service';
import { getAuthSession } from '@/src/lib/auth';

async function executeAutoReminders(triggerSource: string) {
  // Ensure current period exists & roll over
  await ensureCurrentPeriodRollover();

  const now = new Date();
  const day = now.getDate();

  // Determine schedule context
  let scheduleContext = 'Manual On-Demand';
  if (day === 25) {
    scheduleContext = 'Awal Siklus Periode Baru (Tgl 25)';
  } else if (day === 5) {
    scheduleContext = 'Pengingat Tengah Periode (Tgl 5)';
  } else if (day === 15) {
    scheduleContext = 'Pengingat Menjelang Cut-Off (Tgl 15)';
  }

  // Send accumulated reminder to all unpaid members
  const bulkRes = await NotificationService.sendBulkPaymentReminder(
    'AUTO_CRON',
    `Sistem Reminder (${scheduleContext})`
  );

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: 'SYSTEM',
      npk: 'SYSTEM',
      userName: `Auto-Reminder (${scheduleContext})`,
      role: 'ADMIN',
      activity: 'Eksekusi Otomatis Reminder WhatsApp',
      details: `Trigger: ${triggerSource}. Sistem mengirim pengingat ke ${bulkRes.totalSent} anggota yang memiliki tunggakan kas.`,
    },
  });

  return {
    success: true,
    day,
    scheduleContext,
    totalSent: bulkRes.totalSent,
    timestamp: now.toISOString(),
    results: bulkRes.results,
  };
}

// GET: Called by Vercel Cron on the 5th, 15th, and 25th of every month at 02:00 UTC (09:00 WIB)
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    // Verify Vercel Cron or secret key if configured
    if (cronSecret && authHeader !== `Bearer ${cronSecret}` && key !== cronSecret) {
      const session = await getAuthSession();
      if (!session || session.role !== 'ADMIN') {
        const host = request.headers.get('host') || '';
        if (!host.includes('localhost') && !host.includes('127.0.0.1')) {
          return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 });
        }
      }
    }

    const result = await executeAutoReminders('Vercel Cron Schedule (Tgl 5, 15, 25)');
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Cron reminder error:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal menjalankan cron auto-reminder' },
      { status: 500 }
    );
  }
}

// POST: Triggered on-demand by Admin from UI
export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak. Khusus Admin.' }, { status: 403 });
    }

    const result = await executeAutoReminders(`Admin On-Demand Trigger (${session.name})`);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Trigger reminder error:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal menjalankan pengingat' },
      { status: 500 }
    );
  }
}
