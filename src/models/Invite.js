import mongoose from "mongoose";

const inviteSchema = new mongoose.Schema({
  token: { type: String, unique: true },
  admin: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  company: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
  expiresAt: { type: Date, default: () => Date.now() + 1000 * 60 * 60 * 24 }, // 24h
});

export default mongoose.model("Invite", inviteSchema);
