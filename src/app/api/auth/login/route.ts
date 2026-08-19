import { NextRequest, NextResponse } from 'next/server';
import { setSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { role, userId, email, name } = body;

    if (!role || !userId) {
      return NextResponse.json({ error: 'Missing role or userId' }, { status: 400 });
    }

    await setSession({ role, userId, email, name });
    
    return NextResponse.json({ success: true, redirectTo: role === 'rm' ? '/rm' : '/client' });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
