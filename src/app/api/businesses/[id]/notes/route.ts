// src/app/api/businesses/[id]/notes/route.ts
// GET /api/businesses/[id]/notes — list notes
// POST /api/businesses/[id]/notes — add note

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const notes = await prisma.interactionNote.findMany({
      where:   { businessId: id },
      orderBy: { date: 'desc' },
    });
    return NextResponse.json(notes);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load notes' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { note, channel } = await req.json();
    if (!note?.trim() || !channel) {
      return NextResponse.json({ error: 'note and channel are required' }, { status: 400 });
    }
    const created = await prisma.interactionNote.create({
      data: { businessId: id, note: note.trim(), channel, date: new Date() },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
  }
}
