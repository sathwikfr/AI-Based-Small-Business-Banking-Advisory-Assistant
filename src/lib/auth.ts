import { cookies } from 'next/headers';

export type Role = 'rm' | 'client';

export interface SessionData {
  role: Role;
  userId: string; // The ID of the RM or the Business
  email?: string; // The email of the user
  name?: string;  // The name of the user (RM or Business Name)
}

export async function setSession(data: SessionData) {
  const cookieStore = await cookies();
  cookieStore.set('vantage_session', JSON.stringify(data), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 1 week
  });
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('vantage_session');
  if (!sessionCookie) return null;
  try {
    return JSON.parse(sessionCookie.value) as SessionData;
  } catch (error) {
    return null;
  }
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete('vantage_session');
}
