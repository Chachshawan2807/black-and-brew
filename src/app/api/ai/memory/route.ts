import { NextResponse } from 'next/server';
import { MemoryEngine } from '@/lib/ai/memory';

export async function POST(req: Request) {
  try {
    const { text, userId } = await req.json();

    if (!text || !userId) {
      return NextResponse.json({ error: "Missing text or userId" }, { status: 400 });
    }

    const memory = MemoryEngine.getInstance();
    await memory.add(text, userId);

    return NextResponse.json({ success: true, message: "Memory recorded via Node.js" });
  } catch (error) {
    console.error("AI Route Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
