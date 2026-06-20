import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import Topic from "@/models/Topic";
import User from "@/models/User";
import { localDayKey, toLocalMidnightUtc } from "@/lib/date";

const ensureUserSession = async () => {
  const session = await getSession();
  if (!session || session.role !== "user") return null;
  return session;
};

export async function GET() {
  const session = await ensureUserSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();

  const [topics, user] = await Promise.all([
    Topic.find({ userId: session.userId }).sort({ _id: -1 }),
    User.findById(session.userId).lean(),
  ]);

  return NextResponse.json({ topics, user });
}

export async function POST(request) {
  const session = await ensureUserSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();

  const body = await request.json();
  const title = String(body.title || "").trim();
  const tags = Array.isArray(body.tags)
    ? body.tags.map((tag) => String(tag).trim()).filter(Boolean)
    : [];
  const priority = ["High", "Medium", "Low"].includes(body.priority) ? body.priority : "Medium";

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const topic = await Topic.create({
    userId: session.userId,
    title,
    tags,
    priority,
    status: "To Do",
  });

  const user = await User.findById(session.userId);
  const nowMidnight = toLocalMidnightUtc(new Date(), user.timezone);
  if (!user.lastCompletedDate || localDayKey(nowMidnight, user.timezone) !== localDayKey(user.lastCompletedDate, user.timezone)) {
    await User.findByIdAndUpdate(session.userId, { lastCompletedDate: nowMidnight });
  }

  return NextResponse.json(topic, { status: 201 });
}
