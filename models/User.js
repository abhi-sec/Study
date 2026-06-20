import mongoose, { Schema } from "mongoose";

const userSchema = new Schema({
  username: { type: String, required: true, unique: true, index: true, trim: true },
  role: { type: String, enum: ["admin", "user"], default: "user" },
  currentStreak: { type: Number, default: 0 },
  timezone: { type: String, required: true, trim: true },
  lastCompletedDate: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.User || mongoose.model("User", userSchema);
