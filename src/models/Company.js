import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "Admin" }],
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

export default mongoose.model("Company", companySchema);
