import { cookies } from 'next/headers';
import { prisma } from './prisma';

export interface AuthSession {
  id: string;
  npk: string;
  name: string;
  role: string;
  phone: string;
}

export const SESSION_COOKIE_NAME = 'kas_session';

const sessionUserCache = new Map<string, { user: AuthSession; expiry: number }>();

export async function getAuthSession(): Promise<AuthSession | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!sessionCookie || !sessionCookie.value) return null;

    const parsedData = JSON.parse(sessionCookie.value) as AuthSession;
    if (!parsedData || !parsedData.id) return null;

    const cacheKey = parsedData.id;
    const now = Date.now();
    const cached = sessionUserCache.get(cacheKey);
    if (cached && cached.expiry > now) {
      return cached.user;
    }

    // Verify user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: parsedData.id },
      select: { id: true, npk: true, name: true, role: true, phone: true, isActive: true },
    });

    if (!user || !user.isActive) {
      sessionUserCache.delete(cacheKey);
      return null;
    }

    const sessionUser: AuthSession = {
      id: user.id,
      npk: user.npk,
      name: user.name,
      role: user.role,
      phone: user.phone,
    };

    sessionUserCache.set(cacheKey, { user: sessionUser, expiry: now + 60000 });
    return sessionUser;
  } catch (error) {
    return null;
  }
}

export async function requireAdminSession(): Promise<AuthSession> {
  const session = await getAuthSession();
  if (!session || session.role !== 'ADMIN') {
    throw new Error('Unauthorized: Admin access required');
  }
  return session;
}

export async function requireAuthSession(): Promise<AuthSession> {
  const session = await getAuthSession();
  if (!session) {
    throw new Error('Unauthorized: Authentication required');
  }
  return session;
}
