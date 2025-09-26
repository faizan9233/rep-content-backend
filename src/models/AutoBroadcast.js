import mongoose from "mongoose";

const AutoBroadcastSchema = new mongoose.Schema(
  {
    linkedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SlackWorkspace",
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    users: [
      {
        type: String, 
        required: true,
      },
    ],
    weekdays: [
      {
        type: String,
        enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
      },
    ],
    time: {
      type: String, 
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("AutoBroadcast", AutoBroadcastSchema);
