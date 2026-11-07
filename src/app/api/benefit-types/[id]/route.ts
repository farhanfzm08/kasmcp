import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { requireAdminSession } from '@/src/lib/auth';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminSession();
    const { id } = await params;
    const body = await request.json();

    const { name, description, defaultAmount, rules, isActive } = body;

    const benefitType = await prisma.benefitType.update({
      where: { id },
      data: {
        name: name ? String(name).trim() : undefined,
        description: description !== undefined ? String(description).trim() : undefined,
        defaultAmount: defaultAmount !== undefined ? Number(defaultAmount) : undefined,
        rules: rules !== undefined ? String(rules).trim() : undefined,
        isActive: typeof isActive === 'boolean' ? isActive : undefined,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        npk: admin.npk,
        userName: admin.name,
        role: admin.role,
        activity: 'Edit Jenis Santunan',
        details: `Admin memperbarui jenis santunan: ${benefitType.name}.`,
      },
    });

    return NextResponse.json({ success: true, benefitType });
  } catch (error: any) {
    return NextResponse.json({ error: 'Gagal memperbarui jenis santunan' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminSession();
    const { id } = await params;

    const benefitType = await prisma.benefitType.delete({
      where: { id },
    });

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        npk: admin.npk,
        userName: admin.name,
        role: admin.role,
        activity: 'Hapus Jenis Santunan',
        details: `Admin menghapus jenis santunan: ${benefitType.name}.`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Gagal menghapus jenis santunan' }, { status: 500 });
  }
}
