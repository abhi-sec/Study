import mongoose, { Schema } from "mongoose";

const revisionSchema = new Schema({
  intervalDays: { type: Number, enum: [1, 3, 7, 15, 30, 60, 120], required: true },
  targetDate: { type: Date, required: true },
  isReviewed: { type: Boolean, default: false },
});

const topicSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true, trim: true },
  tags: { type: [String], default: [] },
  priority: { type: String, enum: ["High", "Medium", "Low"], default: "Medium" },
  status: {
    type: String,
    enum: ["To Do", "In Progress", "Completed"],
    default: "To Do",
  },
  completionDate: { type: Date, default: null },
  revisions: { type: [revisionSchema], default: [] },
});

topicSchema.index({ userId: 1, status: 1 });
topicSchema.index({ userId: 1, "revisions.targetDate": 1, "revisions.isReviewed": 1 });

export default mongoose.models.Topic || mongoose.model("Topic", topicSchema);
