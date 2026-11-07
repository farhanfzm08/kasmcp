import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { requireAdminSession, getAuthSession } from '@/src/lib/auth';

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await prisma.systemSetting.findMany({
      orderBy: { key: 'asc' },
    });

    const settingsObj: Record<string, string> = {};
    settings.forEach((s) => {
      settingsObj[s.key] = s.value;
    });

    return NextResponse.json({ settings, settingsObj });
  } catch (error: any) {
    return NextResponse.json({ error: 'Gagal mengambil pengaturan sistem' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return PUT(request);
}

export async function PUT(request: Request) {
  try {
    const admin = await requireAdminSession();
    const body = await request.json();

    const { settings } = body; // Array or object of { key, value }

    if (!settings) {
      return NextResponse.json({ error: 'Data pengaturan wajib dikirim' }, { status: 400 });
    }

    const updated = [];
    if (Array.isArray(settings)) {
      for (const item of settings) {
        const s = await prisma.systemSetting.upsert({
          where: { key: item.key },
          update: { value: String(item.value) },
          create: { key: item.key, value: String(item.value) },
        });
        updated.push(s);
      }
    } else if (typeof settings === 'object') {
      for (const [key, value] of Object.entries(settings)) {
        const s = await prisma.systemSetting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        });
        updated.push(s);

        // Sync lowercase keys for backwards compatibility
        if (key === 'FONNTE_API_TOKEN') {
          await prisma.systemSetting.upsert({
            where: { key: 'fonnte_api_token' },
            update: { value: String(value) },
            create: { key: 'fonnte_api_token', value: String(value) },
          });
        }
        if (key === 'FONNTE_API_URL') {
          await prisma.systemSetting.upsert({
            where: { key: 'fonnte_api_url' },
            update: { value: String(value) },
            create: { key: 'fonnte_api_url', value: String(value) },
          });
        }
      }
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        npk: admin.npk,
        userName: admin.name,
        role: admin.role,
        activity: 'Update Pengaturan Sistem',
        details: `Admin memperbarui pengaturan sistem kas sosial (Termasuk Fonnte WhatsApp / Siklus Nominal).`,
      },
    });

    return NextResponse.json({ success: true, updated });
  } catch (error: any) {
    return NextResponse.json({ error: 'Gagal memperbarui pengaturan sistem' }, { status: 500 });
  }
}
