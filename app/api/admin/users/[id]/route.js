import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import User from "@/models/User";
import Topic from "@/models/Topic";

export async function DELETE(_request, { params }) {
  const session = await getSession();
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  await connectToDatabase();

  const [deletedUser] = await Promise.all([
    User.findByIdAndDelete(id),
    Topic.deleteMany({ userId: id }),
  ]);

  if (!deletedUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, deletedUserId: id });
}
