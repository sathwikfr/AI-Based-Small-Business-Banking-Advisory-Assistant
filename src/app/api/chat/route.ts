import { NextResponse } from 'next/server';
import { synthesisProvider } from '@/lib/synthesis';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { messages, businessId } = await req.json();

    let contextData: any = {};

    if (businessId) {
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        include: { signals: { where: { isActive: true } } },
      });
      const policies = await prisma.policyReference.findMany();
      if (business) {
        contextData = {
          business,
          signals: business.signals,
          policies,
        };
      }
    }

    const reply = await synthesisProvider.chat(messages, contextData);

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: 'Failed to process chat message' }, { status: 500 });
  }
}
