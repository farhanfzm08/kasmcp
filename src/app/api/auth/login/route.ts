import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { SESSION_COOKIE_NAME } from '@/src/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { npk, password } = body;

    if (!npk || !password) {
      return NextResponse.json({ error: 'NPK dan password wajib diisi' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { npk: String(npk).trim().toUpperCase() },
    });

    if (!user) {
      return NextResponse.json({ error: 'NPK atau password salah' }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'Akun Anda sedang nonaktif. Silakan hubungi Admin.' }, { status: 403 });
    }

    if (user.password !== password) {
      return NextResponse.json({ error: 'NPK atau password salah' }, { status: 401 });
    }

    const sessionData = {
      id: user.id,
      npk: user.npk,
      name: user.name,
      role: user.role,
      phone: user.phone,
    };

    const response = NextResponse.json({
      success: true,
      user: sessionData,
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: JSON.stringify(sessionData),
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: 'lax',
    });

    // Record Audit Log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        npk: user.npk,
        userName: user.name,
        role: user.role,
        activity: 'User Login',
        details: `User ${user.name} (${user.npk}) berhasil melakukan login.`,
      },
    });

    return response;
  } catch (error: any) {
    console.error('Login API error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
