import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import Topic from "@/models/Topic";
import { addLocalDays, previousLocalDayMidnight, toLocalMidnightUtc } from "@/lib/date";

const hasCompletedYesterday = (user, now) => {
  const previousDay = previousLocalDayMidnight(now, user.timezone);
  if (!user.lastCompletedDate) return false;
  return user.lastCompletedDate >= previousDay;
};

const hasOverdueUnreviewed = async (user, now) => {
  const previousDay = previousLocalDayMidnight(now, user.timezone);
  const overdue = await Topic.findOne({
    userId: user._id,
    revisions: {
      $elemMatch: {
        targetDate: { $lte: previousDay },
        isReviewed: false,
      },
    },
  });
  return Boolean(overdue);
};

const underGracePeriod = (user, now) => {
  const ageInMs = now.getTime() - new Date(user.createdAt).getTime();
  return ageInMs < 24 * 60 * 60 * 1000;
};

const validateCronSecret = (request) => {
  const configured = process.env.CRON_SECRET;
  if (!configured) return true;
  const headerToken = request.headers.get("authorization")?.replace("Bearer ", "");
  return headerToken === configured;
};

async function runEvaluation() {
  await connectToDatabase();
  const now = new Date();
  const users = await User.find({ role: "user" });

  let deleted = 0;
  let incremented = 0;
  let skipped = 0;

  for (const user of users) {
    if (underGracePeriod(user, now)) {
      skipped += 1;
      continue;
    }

    const ruleOneFailed = !hasCompletedYesterday(user, now);
    const ruleTwoFailed = await hasOverdueUnreviewed(user, now);

    if (ruleOneFailed || ruleTwoFailed) {
      await Promise.all([User.deleteOne({ _id: user._id }), Topic.deleteMany({ userId: user._id })]);
      deleted += 1;
      continue;
    }

    const todayMidnight = toLocalMidnightUtc(now, user.timezone);
    const tomorrowMidnight = addLocalDays(now, user.timezone, 1);

    await User.updateOne(
      {
        _id: user._id,
        $or: [{ streakUpdatedAt: { $exists: false } }, { streakUpdatedAt: { $lt: todayMidnight } }],
      },
      {
        $inc: { currentStreak: 1 },
        $set: { streakUpdatedAt: tomorrowMidnight },
      }
    );

    incremented += 1;
  }

  return { deleted, incremented, skipped };
}

export async function GET(request) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runEvaluation();
  return NextResponse.json(result);
}

export async function POST(request) {
  return GET(request);
}
