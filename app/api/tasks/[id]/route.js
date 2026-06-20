import mongoose from "mongoose";
import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Topic from "@/models/Topic";
import User from "@/models/User";
import { getSession } from "@/lib/auth";
import { REVISION_INTERVALS, addLocalDays, toLocalMidnightUtc } from "@/lib/date";

const buildRevisions = (completionDate, timezone) =>
  REVISION_INTERVALS.map((intervalDays) => ({
    intervalDays,
    targetDate: addLocalDays(completionDate, timezone, intervalDays),
    isReviewed: false,
  }));

const ensureUser = async () => {
  const session = await getSession();
  if (session?.role !== "user") return null;
  return session;
};

export async function PUT(request, { params }) {
  const session = await ensureUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid task id" }, { status: 400 });
  }

  await connectToDatabase();

  const topic = await Topic.findOne({ _id: id, userId: session.userId });
  if (!topic) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const body = await request.json();
  const previousStatus = topic.status;

  if (body.title !== undefined) {
    topic.title = String(body.title).trim();
  }

  if (Array.isArray(body.tags)) {
    topic.tags = body.tags.map((tag) => String(tag).trim()).filter(Boolean);
  }

  if (["High", "Medium", "Low"].includes(body.priority)) {
    topic.priority = body.priority;
  }

  if (["To Do", "In Progress", "Completed"].includes(body.status)) {
    topic.status = body.status;
  }

  const user = await User.findById(session.userId);

  if (topic.status === "Completed" && previousStatus !== "Completed") {
    const completionDate = new Date();
    topic.completionDate = completionDate;
    topic.revisions = buildRevisions(completionDate, user.timezone);
    user.lastCompletedDate = toLocalMidnightUtc(completionDate, user.timezone);
    await user.save();
  }

  if (topic.status !== "Completed" && previousStatus === "Completed") {
    topic.completionDate = null;
    topic.revisions = [];
  }

  await topic.save();

  return NextResponse.json(topic);
}

export async function DELETE(_request, { params }) {
  const session = await ensureUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid task id" }, { status: 400 });
  }

  await connectToDatabase();

  const deleted = await Topic.findOneAndDelete({ _id: id, userId: session.userId });

  if (!deleted) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
