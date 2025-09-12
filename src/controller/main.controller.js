import axios from "axios";
import Post from "../models/Post.js";
import User from "../models/User.js";
import crypto from "crypto";
import { sendEmail } from "../utils/send-mail.js";
import bcrypt from "bcryptjs";
import Admin from "../models/Admin.js";
import Company from "../models/Company.js";


export const shareOnLinkedIn = async (req, res) => {
  try {
    const { postId } = req.params;
    const user = req.user; 
    const post = await Post.findById(postId);

    if (!post) return res.status(404).json({ message: "Post not found" });
    if (!user.linkedInToken) return res.status(400).json({ message: "LinkedIn not connected" });

    const linkedinPayload = {
      author: `urn:li:person:${user.linkedInId}`,
      lifecycleState: "PUBLISHED",
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: `${post.title}\n\n${post.content}\n${post.url || ""}` },
          shareMediaCategory: post.picture ? "IMAGE" : "NONE",
        }
      }
    };

    if (post.picture) {
      linkedinPayload.specificContent["com.linkedin.ugc.ShareContent"].media = [
        {
          status: "READY",
          description: { text: post.title },
          originalUrl: post.picture,
          title: { text: post.title }
        }
      ];
    }

    await axios.post("https://api.linkedin.com/v2/ugcPosts", linkedinPayload, {
      headers: {
        Authorization: `Bearer ${user.linkedInToken}`,
        "X-Restli-Protocol-Version": "2.0.0",
        "Content-Type": "application/json"
      }
    });

    // Mark post as shared by user
    if (!post.shares.includes(user._id)) {
      post.shares.push(user._id);
      await post.save();
    }

    res.json({ message: "Post shared successfully on LinkedIn!" });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ message: "Failed to share post on LinkedIn" });
  }
};


export const ShareL = async(req,res)=>{
  const post = await Post.findById(req.params.postId);
  if (!post) return res.status(404).send("Post not found");

  const pageUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${post.title}</title>
      <meta property="og:title" content="${post.title}" />
      <meta property="og:description" content="${post.content}" />
      <meta property="og:image" content="${post.picture || ''}" />
      <meta property="og:url" content="${pageUrl}" />
    </head>
    <body>
      <h1>${post.title}</h1>
      <p>${post.content}</p>
      ${post.picture ? `<img src="${post.picture}" />` : ''}
    </body>
    </html>
  `);
}

export const editUserRole = async (req, res) => {
  try {
    const { id,role } = req.body;

    const existingUser = await User.findById(id);
    existingUser.role = role;
    await existingUser.save();
    res.status(201).json({ user:existingUser });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id,role } = req.params;

    if (!id || !role) {
      return res.status(400).json({ message: "User ID and role are required" });
    }

    let deletedUser;

    if (role === "salesperson") {
      deletedUser = await User.findByIdAndDelete(id);
    } else if (role === "admin") {
      deletedUser = await Admin.findByIdAndDelete(id);
    } else {
      return res.status(400).json({ message: "Invalid role" });
    }

    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ success: true, user: deletedUser });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const inviteUser = async (req, res) => {
  try {
    const { name, email, type } = req.body;
    const inviter = req.user; 

    if (!name || !email || !type) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const existingAdmin = await Admin.findOne({ email });
    const existingUser = await User.findOne({ email });

    if (existingAdmin || existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    const plainPassword = crypto.randomBytes(6).toString("hex");
    const hashedPassword = plainPassword;

    let newRecord;

    if (type === "admin") {
      newRecord = await Admin.create({
        name,
        email,
        password: hashedPassword,
        role: "admin",
        company: inviter.company, 
      });
      await Company.findByIdAndUpdate(inviter.company, { $addToSet: { admins: newRecord._id } });
    } else if (type === "salesperson") {
      newRecord = await User.create({
        name,
        email,
        password: hashedPassword,
        role: "salesperson",
        company: inviter.company, 
      });

      await Company.findByIdAndUpdate(inviter.company, { $addToSet: { users: newRecord._id } });
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid type. Must be 'admin' or 'salesperson'",
      });
    }

    await sendEmail(email, name, plainPassword, type);

    return res.status(201).json({
      success: true,
      message: `${type} invited successfully`,
      data: {
        id: newRecord._id,
        name: newRecord.name,
        email: newRecord.email,
        role: type,
      },
    });
  } catch (err) {
    console.error("Invite user error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
