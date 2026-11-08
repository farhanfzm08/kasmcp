import { prisma } from './prisma';

/**
 * Helper to determine which cash period a given date belongs to:
 * Rule: 25th of month M to 24th of month M+1 belongs to Period M.
 * Examples:
 * - 25 Agustus - 24 September => Periode Agustus
 * - 23 Juli => Periode Juni (karena masih sebelum tgl 25 Juli)
 */
export function getPeriodForDate(date: Date = new Date()): { month: number; year: number } {
  const day = date.getDate();
  let month = date.getMonth() + 1; // 1 - 12
  let year = date.getFullYear();

  if (day < 25) {
    month -= 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
  }

  return { month, year };
}

/**
 * Returns the exact start and end timestamps for a period (month, year):
 * - Start: 25th of month, 00:00:00.000
 * - End: 24th of month + 1, 23:59:59.999
 */
export function getPeriodDateRange(month: number, year: number): { startDate: Date; endDate: Date } {
  const startDate = new Date(year, month - 1, 25, 0, 0, 0, 0);
  let endMonth = month + 1;
  let endYear = year;
  if (endMonth > 12) {
    endMonth = 1;
    endYear += 1;
  }
  const endDate = new Date(endYear, endMonth - 1, 24, 23, 59, 59, 999);
  return { startDate, endDate };
}

/**
 * Formats a clean human-readable label with date range info:
 * E.g. "Agustus 2026 (25 Agt - 24 Sep)"
 */
export function formatPeriodLabel(month: number, year: number): string {
  const monthsShort = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des',
  ];
  const monthsFull = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  let nextMonth = month + 1;
  let nextYear = year;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }

  const startLabel = `25 ${monthsShort[month - 1]}`;
  const endLabel = `24 ${monthsShort[nextMonth - 1]}`;
  return `${monthsFull[month - 1]} ${year} (${startLabel} - ${endLabel})`;
}

export async function ensureSpecificPeriod(targetMonth: number, targetYear: number) {
  try {
    // Single source of truth for monthly cash fee & cycle dates
    const settings = await prisma.systemSetting.findMany({
      where: {
        key: { in: ['DEFAULT_MONTHLY_AMOUNT', 'CYCLE_START_DAY', 'DUE_DATE_DAY'] },
      },
    });

    const settingsMap: Record<string, string> = {};
    settings.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    const defaultAmount = Number(settingsMap['DEFAULT_MONTHLY_AMOUNT'] || 50000);
    const cycleStartDay = Number(settingsMap['CYCLE_START_DAY'] || 25);
    const dueDateDay = Number(settingsMap['DUE_DATE_DAY'] || 24);

    const monthsIndo = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];

    // For Kas [targetMonth] [targetYear]:
    // Billing start: 25 [targetMonth] [targetYear]
    // End date / Jatuh tempo: 24 (or dueDateDay) [targetMonth + 1] [targetYear]
    let dueMonth = targetMonth + 1;
    let dueYear = targetYear;
    if (dueMonth > 12) {
      dueMonth = 1;
      dueYear += 1;
    }
    const dueDate = new Date(dueYear, dueMonth - 1, dueDateDay, 23, 59, 59);

    let period = await prisma.cashPeriod.findFirst({
      where: { month: targetMonth, year: targetYear },
    });

    if (!period) {
      period = await prisma.cashPeriod.create({
        data: {
          month: targetMonth,
          year: targetYear,
          title: `${monthsIndo[targetMonth - 1]} ${targetYear}`,
          cycleStartDay,
          dueDate,
          monthlyAmount: defaultAmount,
          isActive: true,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: 'SYSTEM',
          npk: 'SYSTEM',
          userName: 'Auto-Period Engine',
          role: 'ADMIN',
          activity: 'Generate Periode Kas Otomatis',
          details: `Sistem mengaktifkan siklus kas ${period.title} (Siklus: 25 ${monthsIndo[targetMonth - 1]} ${targetYear} s/d 24 ${monthsIndo[dueMonth - 1]} ${dueYear}).`,
        },
      });
    } else {
      const needsUpdate =
        period.monthlyAmount !== defaultAmount ||
        period.dueDate.getTime() !== dueDate.getTime() ||
        period.cycleStartDay !== cycleStartDay;

      if (needsUpdate) {
        period = await prisma.cashPeriod.update({
          where: { id: period.id },
          data: {
            monthlyAmount: defaultAmount,
            dueDate,
            cycleStartDay,
          },
        });

        await prisma.paymentObligation.updateMany({
          where: { cashPeriodId: period.id },
          data: { dueDate },
        });
      }
    }

    // Ensure all active members have obligations for this period
    const activeMembers = await prisma.user.findMany({
      where: { role: 'USER', isActive: true },
    });

    const existingObligations = await prisma.paymentObligation.findMany({
      where: { cashPeriodId: period.id },
      select: { userId: true },
    });

    const existingUserIds = new Set(existingObligations.map((o) => o.userId));

    for (const member of activeMembers) {
      if (!existingUserIds.has(member.id)) {
        await prisma.paymentObligation.create({
          data: {
            userId: member.id,
            cashPeriodId: period.id,
            amount: defaultAmount,
            status: 'BELUM_BAYAR',
            dueDate: period.dueDate,
          },
        });
      }
    }

    const now = new Date();
    if (now > dueDate) {
      await prisma.paymentObligation.updateMany({
        where: {
          cashPeriodId: period.id,
          status: 'BELUM_BAYAR',
        },
        data: { status: 'TERLAMBAT' },
      });
    } else {
      await prisma.paymentObligation.updateMany({
        where: {
          cashPeriodId: period.id,
          status: 'TERLAMBAT',
        },
        data: { status: 'BELUM_BAYAR' },
      });
    }

    return period;
  } catch (error) {
    console.error('Error in ensureSpecificPeriod:', error);
    return null;
  }
}

export async function ensureUpcomingPeriods(monthsAhead: number = 0, monthsBack: number = 5) {
  const now = new Date();
  const { month: currentMonth, year: currentYear } = getPeriodForDate(now);

  // Clean up any future periods automatically created beyond the current active period
  const futurePeriods = await prisma.cashPeriod.findMany({
    where: {
      OR: [
        { year: { gt: currentYear } },
        { year: currentYear, month: { gt: currentMonth } },
      ],
    },
  });

  if (futurePeriods.length > 0) {
    const futurePeriodIds = futurePeriods.map((p) => p.id);
    await prisma.paymentObligation.deleteMany({
      where: { cashPeriodId: { in: futurePeriodIds } },
    });
    await prisma.cashPeriod.deleteMany({
      where: { id: { in: futurePeriodIds } },
    });
  }

  // Generate past months automatically based on 25-24 rule
  for (let i = monthsBack; i >= 1; i--) {
    let targetMonth = currentMonth - i;
    let targetYear = currentYear;

    while (targetMonth < 1) {
      targetMonth += 12;
      targetYear -= 1;
    }

    await ensureSpecificPeriod(targetMonth, targetYear);
  }

  // Generate current period automatically
  await ensureSpecificPeriod(currentMonth, currentYear);
}

let lastRolloverCheck = 0;
const ROLLOVER_INTERVAL = 15 * 60 * 1000; // 15 minutes cache debounce

export async function ensureCurrentPeriodRollover() {
  const nowTime = Date.now();
  if (nowTime - lastRolloverCheck < ROLLOVER_INTERVAL) {
    return;
  }
  lastRolloverCheck = nowTime;

  const now = new Date();
  const { month: currentMonth, year: currentYear } = getPeriodForDate(now);

  // Fast check: if current period already exists, do nothing!
  const currentPeriod = await prisma.cashPeriod.findFirst({
    where: { month: currentMonth, year: currentYear },
    select: { id: true },
  });

  if (currentPeriod) {
    return;
  }

  // Only if current period doesn't exist yet, generate it
  await ensureSpecificPeriod(currentMonth, currentYear);
}
