import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { requireAdminSession } from '@/src/lib/auth';
import { normalizePhone } from '@/src/lib/format';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminSession();
    const { id } = await params;
    const body = await request.json();

    const { name, phone, password, role, isActive, joinedAt } = body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: 'Anggota tidak ditemukan' }, { status: 404 });
    }

    const updateData: any = {};
    if (name) updateData.name = String(name).trim();
    if (phone) updateData.phone = normalizePhone(phone);
    if (password) updateData.password = String(password).trim();
    if (role) updateData.role = role;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (joinedAt) updateData.joinedAt = new Date(joinedAt);

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        npk: admin.npk,
        userName: admin.name,
        role: admin.role,
        activity: 'Edit Data Anggota',
        details: `Admin memperbarui data anggota ${updatedUser.name} (NPK: ${updatedUser.npk}).`,
      },
    });

    return NextResponse.json({ success: true, member: updatedUser });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal memperbarui anggota' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminSession();
    const { id } = await params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: 'Anggota tidak ditemukan' }, { status: 404 });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        npk: admin.npk,
        userName: admin.name,
        role: admin.role,
        activity: updatedUser.isActive ? 'Mengaktifkan Anggota' : 'Menonaktifkan Anggota',
        details: `Admin mengubah status anggota ${updatedUser.name} (${updatedUser.npk}) menjadi ${updatedUser.isActive ? 'Aktif' : 'Nonaktif'}.`,
      },
    });

    return NextResponse.json({ success: true, member: updatedUser });
  } catch (error: any) {
    return NextResponse.json({ error: 'Gagal mengubah status anggota' }, { status: 500 });
  }
}
