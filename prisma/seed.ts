import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('Seeding initial data...');

  // 1. Seed Users
  const admin = await prisma.user.upsert({
    where: { npk: 'ADMIN01' },
    update: {},
    create: {
      npk: 'ADMIN01',
      name: 'Administrator Kas',
      password: 'admin123',
      phone: '6281234567890',
      role: 'ADMIN',
      isActive: true,
      joinedAt: new Date('2025-01-01'),
    },
  });

  const u1 = await prisma.user.upsert({
    where: { npk: '1001' },
    update: {},
    create: {
      npk: '1001',
      name: 'Budi Santoso',
      password: 'user123',
      phone: '6281234567891',
      role: 'USER',
      isActive: true,
      joinedAt: new Date('2025-01-15'),
    },
  });

  const u2 = await prisma.user.upsert({
    where: { npk: '1002' },
    update: {},
    create: {
      npk: '1002',
      name: 'Siti Aminah',
      password: 'user123',
      phone: '6281234567892',
      role: 'USER',
      isActive: true,
      joinedAt: new Date('2025-02-01'),
    },
  });

  const u3 = await prisma.user.upsert({
    where: { npk: '1003' },
    update: {},
    create: {
      npk: '1003',
      name: 'Agus Raharjo',
      password: 'user123',
      phone: '6281234567893',
      role: 'USER',
      isActive: true,
      joinedAt: new Date('2025-02-15'),
    },
  });

  const u4 = await prisma.user.upsert({
    where: { npk: '1004' },
    update: {},
    create: {
      npk: '1004',
      name: 'Dewi Lestari',
      password: 'user123',
      phone: '6281234567894',
      role: 'USER',
      isActive: true,
      joinedAt: new Date('2025-03-01'),
    },
  });

  const u5 = await prisma.user.upsert({
    where: { npk: '1005' },
    update: {},
    create: {
      npk: '1005',
      name: 'Eko Prasetyo',
      password: 'user123',
      phone: '6281234567895',
      role: 'USER',
      isActive: true,
      joinedAt: new Date('2025-03-10'),
    },
  });

  // 2. Seed System Settings
  const settings = [
    { key: 'DEFAULT_MONTHLY_AMOUNT', value: '50000', description: 'Nominal kas bulanan per anggota' },
    { key: 'CYCLE_START_DAY', value: '25', description: 'Tanggal awal/terbit tagihan kas bulanan' },
    { key: 'DUE_DATE_DAY', value: '15', description: 'Tanggal jatuh tempo / batas akhir di bulan berikutnya' },
    { key: 'ORG_NAME', value: 'Measuring Center', description: 'Nama organisasi / unit' },
    { key: 'FONNTE_API_URL', value: 'https://api.fonnte.com/send', description: 'URL API Fonnte WhatsApp' },
    { key: 'FONNTE_API_TOKEN', value: '', description: 'Token API Fonnte WhatsApp' },
    {
      key: 'PAYMENT_METHOD_INFO',
      value: 'Pembayaran Kas Sosial disetor tunai (CASH) langsung ke Bendahara Measuring Center',
      description: 'Petunjuk pembayaran kas di portal anggota',
    },
    {
      key: 'WA_TEMPLATE_REMINDER',
      value: 'Halo {nama} ({npk}), mengingatkan pembayaran Kas Sosial Measuring Center untuk periode {periode} sebesar {nominal}. Jatuh tempo pada tanggal {jatuh_tempo}. Terima kasih!',
      description: 'Template WhatsApp pengingat tagihan',
    },
    {
      key: 'WA_TEMPLATE_RECEIPT',
      value: 'Terima kasih {nama} ({npk}), pembayaran Kas Sosial Measuring Center periode {periode} sebesar {nominal} telah DITERIMA dan DIVERIFIKASI pada tanggal {tanggal_bayar}.',
      description: 'Template WhatsApp kwitansi pelunasan',
    },
  ];

  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: { value: s.value, description: s.description },
      create: s,
    });
  }

  // 3. Seed Income Categories
  const categories = ['Kas Bulanan Anggota', 'Donasi Sukarela', 'Sponsorship / Hibah', 'Bunga Bank / Hasil Usaha'];
  for (const cat of categories) {
    await prisma.incomeCategory.upsert({
      where: { name: cat },
      update: {},
      create: { name: cat },
    });
  }

  // 4. Seed Benefit Types (Santunan)
  const benefits = [
    {
      name: 'Santunan Meninggal Dunia',
      description: 'Santunan duka untuk anggota atau keluarga inti yang meninggal dunia.',
      defaultAmount: 1000000,
      rules: 'Wajib menyertakan surat keterangan kematian dari pihak berwenang.',
    },
    {
      name: 'Santunan Sakit / Rawat Inap',
      description: 'Santunan untuk anggota yang dirawat inap di Rumah Sakit minimal 2 hari.',
      defaultAmount: 500000,
      rules: 'Wajib menyertakan surat keterangan rawat inap RS.',
    },
    {
      name: 'Santunan Kecelakaan',
      description: 'Santunan untuk anggota yang mengalami kecelakaan kerja atau lalu lintas.',
      defaultAmount: 750000,
      rules: 'Wajib menyertakan bukti medis kecelakaan.',
    },
    {
      name: 'Santunan Kelahiran',
      description: 'Santunan kebahagiaan atas kelahiran putra/putri pertama sampai ketiga anggota.',
      defaultAmount: 300000,
      rules: 'Wajib menyertakan surat keterangan lahir dari bidan/RS.',
    },
  ];

  for (const b of benefits) {
    await prisma.benefitType.upsert({
      where: { name: b.name },
      update: b,
      create: b,
    });
  }

  // 5. Seed Cash Period (Agustus 2026)
  const existingPeriod = await prisma.cashPeriod.findFirst({
    where: { month: 8, year: 2026 },
  });

  let period = existingPeriod;
  if (!period) {
    period = await prisma.cashPeriod.create({
      data: {
        month: 8,
        year: 2026,
        title: 'Kas Sosial Agustus 2026',
        cycleStartDay: 25,
        dueDate: new Date('2026-08-25'),
        monthlyAmount: 50000,
        isActive: true,
      },
    });
  }

  // 6. Seed Obligations & Transactions for Members
  const users = [u1, u2, u3, u4, u5];
  const paidStatusMap: Record<string, boolean> = {
    '1001': true,
    '1002': true,
    '1003': true,
    '1004': false,
    '1005': false,
  };

  for (const u of users) {
    const isPaid = paidStatusMap[u.npk];
    const status = isPaid ? 'SUDAH_BAYAR' : 'BELUM_BAYAR';

    const obligation = await prisma.paymentObligation.upsert({
      where: { id: `ob-202608-${u.id}` },
      update: {},
      create: {
        id: `ob-202608-${u.id}`,
        userId: u.id,
        cashPeriodId: period.id,
        amount: 50000,
        status: status,
        dueDate: new Date('2026-08-25'),
        paidAt: isPaid ? new Date('2026-08-20') : null,
        adminId: isPaid ? admin.id : null,
        adminName: isPaid ? admin.name : null,
        notes: isPaid ? 'Pembayaran kas disetor tunai ke Bendahara' : null,
      },
    });

    if (isPaid) {
      const payTx = await prisma.paymentTransaction.upsert({
        where: { obligationId: obligation.id },
        update: {},
        create: {
          obligationId: obligation.id,
          userId: u.id,
          cashPeriodId: period.id,
          amount: 50000,
          paymentDate: new Date('2026-08-20'),
          adminId: admin.id,
          adminName: admin.name,
        },
      });

      await prisma.incomeTransaction.upsert({
        where: { paymentTransactionId: payTx.id },
        update: {},
        create: {
          date: new Date('2026-08-20'),
          title: `Kas Bulanan - ${u.name} (${u.npk}) - Agustus 2026`,
          category: 'Kas Bulanan Anggota',
          amount: 50000,
          notes: `Pembayaran kas otomatis untuk periode Agustus 2026`,
          adminId: admin.id,
          adminName: admin.name,
          paymentTransactionId: payTx.id,
          isAutoPayment: true,
        },
      });
    }
  }

  // 7. Seed Additional Manual Income (Donation)
  await prisma.incomeTransaction.create({
    data: {
      date: new Date('2026-08-05'),
      title: 'Donasi Sukarela Kegiatan Sosial',
      category: 'Donasi Sukarela',
      amount: 1500000,
      notes: 'Donasi dari Management Measuring Center untuk dana abadi kas sosial',
      adminId: admin.id,
      adminName: admin.name,
      isAutoPayment: false,
    },
  });

  // 8. Seed Expense Transaction (Santunan Sakit)
  const sakitBenefit = await prisma.benefitType.findUnique({
    where: { name: 'Santunan Sakit / Rawat Inap' },
  });

  if (sakitBenefit) {
    await prisma.expenseTransaction.create({
      data: {
        date: new Date('2026-08-12'),
        benefitTypeId: sakitBenefit.id,
        benefitTypeName: sakitBenefit.name,
        recipientType: 'MEMBER',
        recipientName: u3.name,
        recipientRelationship: 'Diri Sendiri',
        memberId: u3.id,
        memberName: u3.name,
        amount: 500000,
        notes: 'Santunan rawat inap di RS Mitra Keluarga selama 3 hari',
        adminId: admin.id,
        adminName: admin.name,
      },
    });
  }

  // 9. Initial Audit Log
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      npk: admin.npk,
      userName: admin.name,
      role: admin.role,
      activity: 'Inisialisasi Sistem',
      details: 'Sistem Kas Sosial Measuring Center berhasil diinisialisasi beserta data awal.',
    },
  });

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
