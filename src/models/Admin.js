import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const adminSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, sparse: true },
    name: { type: String },
    password: { type: String },
    role: {
      type: String,
      enum: ["superadmin", "admin"],
      default: "admin",
    },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
    invite: { type: mongoose.Schema.Types.ObjectId, ref: "Invite" },

    hubspotId: { type: String, unique: true, sparse: true },
    zohoId: { type: String, unique: true, sparse: true },
    hubspotToken: { type: String },
    zohoToken: { type: String },

    linkedinId: { type: String, unique: true, sparse: true },
    linkedinName: { type: String },
    linkedinToken: { type: String },
    linkedinRefreshToken: { type: String },
    linkedinProfilePic: { type: String },
  },
  { timestamps: true }
);

adminSchema.pre("save", async function (next) {
  if (!this.password || !this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

adminSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

export default mongoose.model("Admin", adminSchema);
