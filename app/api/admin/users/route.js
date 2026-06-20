import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import User from "@/models/User";
import Topic from "@/models/Topic";

const ensureAdmin = async () => {
  const session = await getSession();
  return session?.role === "admin";
};

export async function GET() {
  if (!(await ensureAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectToDatabase();

  const users = await User.find({ role: "user" }).sort({ createdAt: -1 }).lean();
  const userIds = users.map((user) => user._id);

  const topicCounts = await Topic.aggregate([
    { $match: { userId: { $in: userIds } } },
    { $group: { _id: "$userId", count: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] } } } },
  ]);

  const countsByUser = topicCounts.reduce((acc, item) => {
    acc[item._id.toString()] = { count: item.count, completed: item.completed };
    return acc;
  }, {});

  const payload = users.map((user) => {
    const key = user._id.toString();
    return {
      ...user,
      topicCount: countsByUser[key]?.count || 0,
      completedCount: countsByUser[key]?.completed || 0,
    };
  });

  return NextResponse.json(payload);
}

export async function POST(request) {
  if (!(await ensureAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectToDatabase();

  const body = await request.json();
  const username = String(body.username || "").trim().toLowerCase();
  const timezone = String(body.timezone || "UTC").trim() || "UTC";

  if (!username) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }

  const exists = await User.findOne({ username });
  if (exists) {
    return NextResponse.json({ error: "Username already exists" }, { status: 409 });
  }

  const user = await User.create({ username, timezone, role: "user" });
  return NextResponse.json(user, { status: 201 });
}
