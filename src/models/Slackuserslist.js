
import mongoose from "mongoose";

const SlackUserListSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
    workspaceId: { type: String, required: true },
    userIds: [{ type: String }],
  },
  { timestamps: true }
);

export default mongoose.models.SlackUserList ||
  mongoose.model("SlackUserList", SlackUserListSchema);
