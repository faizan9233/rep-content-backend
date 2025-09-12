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
      default: "admin" 
    },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company" }
  },
  { timestamps: true }
);

adminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

adminSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

export default mongoose.model("Admin", adminSchema);
