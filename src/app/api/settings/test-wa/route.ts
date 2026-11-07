import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/src/lib/auth';
import { prisma } from '@/src/lib/prisma';
import { normalizePhone } from '@/src/lib/format';

export async function POST(request: Request) {
  try {
    const admin = await requireAdminSession();
    const body = await request.json();
    const { targetPhone } = body;

    if (!targetPhone) {
      return NextResponse.json({ error: 'Nomor HP tujuan wajib diisi' }, { status: 400 });
    }

    const apiUrlSetting = await prisma.systemSetting.findUnique({ where: { key: 'FONNTE_API_URL' } });
    const apiTokenSetting = await prisma.systemSetting.findUnique({ where: { key: 'FONNTE_API_TOKEN' } });

    const apiUrl = process.env.FONNTE_API_URL || apiUrlSetting?.value || 'https://api.fonnte.com/send';
    const apiToken = process.env.FONNTE_API_TOKEN || apiTokenSetting?.value;

    if (!apiToken || apiToken.trim() === '' || apiToken.startsWith('MOCK_')) {
      return NextResponse.json(
        {
          error:
            'Fonnte API Token belum diisi di Pengaturan atau masih berupa MOCK_TOKEN. Silakan masukkan API Token resmi dari fonnte.com!',
        },
        { status: 400 }
      );
    }

    const formattedPhone = normalizePhone(targetPhone);
    const testMessage = `*[TES KONEKSI FONNTE WA - KAS SOSIAL MEASURING CENTER]*\n\nHalo Admin ${admin.name},\n\nJika Anda menerima pesan ini, artinya integrasi API Fonnte WhatsApp Gateway pada aplikasi Kas Sosial telah *BERHASIL BERHUBUNGAN* dengan lancar!\n\nWaktu Tes: ${new Date().toLocaleString('id-ID')}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: apiToken.trim(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target: formattedPhone,
        message: testMessage,
      }),
    });

    const fonnteRes = await response.json();

    if (response.ok && (fonnteRes.status === true || fonnteRes.detail || fonnteRes.id)) {
      return NextResponse.json({
        success: true,
        message: `Tes kirim WA ke ${formattedPhone} BERHASIL! Silakan periksa pesan masuk di WhatsApp HP Anda.`,
        fonnteRes,
      });
    } else {
      return NextResponse.json(
        {
          error: `Fonnte API Menolak Koneksi: ${fonnteRes.reason || fonnteRes.message || JSON.stringify(fonnteRes)}`,
          fonnteRes,
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan koneksi ke server Fonnte' },
      { status: 500 }
    );
  }
}
