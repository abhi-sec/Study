import mongoose from "mongoose";
import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import Topic from "@/models/Topic";

export async function PATCH(_request, { params }) {
  const session = await getSession();
  if (session?.role !== "user") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, revisionId } = await params;

  if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(revisionId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  await connectToDatabase();

  const topic = await Topic.findOne({ _id: id, userId: session.userId });
  if (!topic) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const revision = topic.revisions.id(revisionId);
  if (!revision) {
    return NextResponse.json({ error: "Revision not found" }, { status: 404 });
  }

  revision.isReviewed = true;
  await topic.save();

  return NextResponse.json(topic);
}
