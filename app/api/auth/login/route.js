import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import { ADMIN_PASSWORD, ADMIN_USERNAME, setSessionCookie } from "@/lib/auth";

export async function POST(request) {
  try {
    const body = await request.json();
    const username = String(body.username || "").trim().toLowerCase();
    const password = body.password ? String(body.password) : null;
    const timezone = String(body.timezone || "UTC").trim() || "UTC";

    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    if (username === ADMIN_USERNAME.toLowerCase()) {
      if (password !== ADMIN_PASSWORD) {
        return NextResponse.json({ error: "Invalid admin credentials" }, { status: 401 });
      }

      await setSessionCookie({ role: "admin", username: ADMIN_USERNAME });
      return NextResponse.json({ role: "admin", username: ADMIN_USERNAME });
    }

    await connectToDatabase();
    const user = await User.findOne({ username, role: "user" });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    if (timezone && timezone !== user.timezone) {
      user.timezone = timezone;
      await user.save();
    }

    await setSessionCookie({
      role: "user",
      userId: user._id.toString(),
      username: user.username,
      timezone: user.timezone,
    });

    return NextResponse.json({
      role: "user",
      userId: user._id,
      username: user.username,
      timezone: user.timezone,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
