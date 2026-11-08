import { prisma } from './prisma';

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
    const dueDateDay = Number(settingsMap['DUE_DATE_DAY'] || 15);

    const monthsIndo = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];

    // For Kas [targetMonth] [targetYear]:
    // Billing start: 25 [targetMonth] [targetYear]
    // Due Date: 15 [targetMonth + 1] [targetYear]
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
          details: `Sistem mengaktifkan siklus kas ${period.title} (Awal: ${cycleStartDay} ${monthsIndo[targetMonth - 1]} ${targetYear}, Jatuh Tempo: ${dueDateDay} ${monthsIndo[dueMonth - 1]} ${dueYear}).`,
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
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Clean up any future periods automatically created beyond the current month/year
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

  // Generate past 5 months automatically
  for (let i = monthsBack; i >= 1; i--) {
    let targetMonth = currentMonth - i;
    let targetYear = currentYear;

    while (targetMonth < 1) {
      targetMonth += 12;
      targetYear -= 1;
    }

    await ensureSpecificPeriod(targetMonth, targetYear);
  }

  // Generate current month automatically
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
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Fast check: if current period already exists, do nothing!
  const currentPeriod = await prisma.cashPeriod.findFirst({
    where: { month: currentMonth, year: currentYear },
    select: { id: true },
  });

  if (currentPeriod) {
    return;
  }

  // Only if current period doesn't exist yet, generate current month
  await ensureSpecificPeriod(currentMonth, currentYear);
}

