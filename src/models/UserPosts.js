import mongoose from "mongoose";

const postSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  postLink: { type: String },
  url: String, 
   media: [
      {
        type: {
          type: String, 
          enum: ["Image", "Video","Document"],
        },
        url: String, 
      },
    ],
 isApproved: {
  type: String,
  enum: ["pending", "approved", "rejected"],
  default: "pending",
},
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
}, { timestamps: true });

export default mongoose.model("UserPosts", postSchema);
