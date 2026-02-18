import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const limit = Math.min(Number(searchParams.get("limit") || 20), 100);

  const where: Record<string, unknown> = {};
  if (status !== null && status !== "") {
    where.status = Number(status);
  }

  const sessions = await prisma.session.findMany({
    where,
    orderBy: { id: "desc" },
    take: limit,
  });

  return NextResponse.json(sessions);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, exerciser, exerciseType, targetReps, actualReps } = body;

    if (sessionId === undefined || !exerciser) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const targetMet = actualReps >= targetReps;
    const addr = exerciser.toLowerCase();

    // Upsert session — create if indexer hasn't seen it yet, update if it has
    const session = await prisma.session.upsert({
      where: { id: Number(sessionId) },
      create: {
        id: Number(sessionId),
        exerciser: addr,
        exerciseType: Number(exerciseType),
        targetReps: Number(targetReps),
        actualReps: Number(actualReps),
        startTime: Math.floor(Date.now() / 1000),
        status: 1, // Resolved
        targetMet,
      },
      update: {
        actualReps: Number(actualReps),
        status: 1,
        targetMet,
      },
    });

    // Upsert fighter stats — accumulate reps into the right stat
    // Pushups=0→strength, Squats=1→endurance, JumpingJacks=2→agility
    const statField =
      exerciseType === 0 ? "strength" : exerciseType === 1 ? "endurance" : "agility";
    const repsNum = Number(actualReps);

    const existing = await prisma.fighter.findUnique({ where: { address: addr } });

    if (existing) {
      const newTotal = existing.totalReps + repsNum;
      await prisma.fighter.update({
        where: { address: addr },
        data: {
          [statField]: (existing[statField as keyof typeof existing] as number) + repsNum,
          totalReps: newTotal,
          level: Math.floor(newTotal / 10),
        },
      });
    } else {
      await prisma.fighter.create({
        data: {
          address: addr,
          [statField]: repsNum,
          totalReps: repsNum,
          level: Math.floor(repsNum / 10),
        },
      });
    }

    return NextResponse.json({ session, targetMet });
  } catch (err) {
    console.error("POST /api/sessions error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save session" },
      { status: 500 }
    );
  }
}
