import mongoose from "mongoose";

const slackWorkspaceSchema = new mongoose.Schema({
  teamId: { type: String, unique: true },
  teamName: String,
  botToken: String,
  installedBy: {
    slackUserId: String,
    email: String,
  },
  linkedUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, 
}, { timestamps: true });

export default mongoose.model("SlackWorkspace", slackWorkspaceSchema);
