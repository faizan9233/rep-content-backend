import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, sparse: true },
    name: { type: String },
    password: { type: String },
    role: { type: String, enum: ['admin', 'salesperson'], default: 'salesperson' },

    hubspotId: { type: String, unique: true, sparse: true },
    zohoId: { type: String, unique: true, sparse: true },
    linkedinId: { type: String, unique: true, sparse: true },

    hubspotToken: { type: String },
    zohoToken: { type: String },

    linkedinName: { type: String },
    linkedinToken: { type: String },
    linkedinRefreshToken: { type: String },
    linkedinProfilePic: { type: String },

    slackId: { type: String },     
    slackAccessToken: { type: String } 
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

export default mongoose.model("User", userSchema);
