import axios from "axios";
import { supabase } from "../config/supabase-client.js";
import Post from "../models/Post.js";
import User from "../models/User.js";
import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";

export const createPost = async (req, res) => {
  try {
    const { title, description } = req.body;
    const createdBy = req.user?._id;

    if (!title) {
      return res
        .status(400)
        .json({ success: false, message: "Title is required" });
    }

    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json({
          success: false,
          message: "At least one media file is required",
        });
    }

    let mediaArr = [];

    for (const file of req.files) {
      const ext = file.originalname.split(".").pop();
      const fileName = `${uuidv4()}.${ext}`;
      const filePath = `posts/${fileName}`;

      const { error } = await supabase.storage
        .from("media")
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (error) {
        console.error("Supabase upload error:", error.message);
        return res
          .status(500)
          .json({ success: false, message: "Failed to upload media" });
      }

      const { data: publicUrlData } = supabase.storage
        .from("media")
        .getPublicUrl(filePath);

      mediaArr.push({
        type: file.mimetype.startsWith("image")
          ? "Image"
          : file.mimetype.startsWith("video")
          ? "Video"
          : "Document",
        url: publicUrlData.publicUrl,
      });
    }

    const newPost = new Post({
      title,
      description,
      media: mediaArr,
      createdBy,
    });

    await newPost.save();

    res.status(201).json({
      success: true,
      message: "Post created successfully",
      post: newPost,
    });
  } catch (error) {
    console.error("Create post error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getAllPosts = async (req, res) => {
  try {
      const posts = await Post.find({})
      .populate("createdBy", "name email") 
      .populate("likes", "name email")  
      .populate("shares", "name email linkedinProfilePic");
    

    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({});

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) return res.status(404).json({ message: "Post not found" });

    res.json(post);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updatePost = async (req, res) => {
  try {
    const { postId, title, description, existingMedia } = req.body;

    if (!postId) {
      return res
        .status(400)
        .json({ success: false, message: "Post ID is required" });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }
    if (title) post.title = title;
    if (description) post.description = description;

    let mediaToKeep = [];
    if (existingMedia) {
      try {
        mediaToKeep = JSON.parse(existingMedia);
      } catch (err) {
        console.error("Error parsing existingMedia:", err);
        return res
          .status(400)
          .json({ success: false, message: "Invalid existingMedia format" });
      }
    }

    const mediaToDelete = post.media.filter(
      (m) => !mediaToKeep.find((keep) => keep.url === m.url)
    );

    for (const m of mediaToDelete) {
      const filePath = m.url.split("/storage/v1/object/public/media/")[1];
      if (filePath) {
        const { error } = await supabase.storage
          .from("media")
          .remove([filePath]);
        if (error) console.error("Failed to delete media:", error.message);
      }
    }

    post.media = mediaToKeep;

    if (req.files && req.files.length > 0) {
      const newMediaArr = [];

      for (const file of req.files) {
        const ext = file.originalname.split(".").pop();
        const fileName = `${uuidv4()}.${ext}`;
        const filePath = `posts/${fileName}`;

        const { error } = await supabase.storage
          .from("media")
          .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            upsert: false,
          });

        if (error) {
          console.error("Supabase upload error:", error.message);
          return res
            .status(500)
            .json({ success: false, message: "Failed to upload media" });
        }

        const { data: publicUrlData } = supabase.storage
          .from("media")
          .getPublicUrl(filePath);

        newMediaArr.push({
          type: file.mimetype.startsWith("image")
            ? "Image"
            : file.mimetype.startsWith("video")
            ? "Video"
            : "Document",
          url: publicUrlData.publicUrl,
        });
      }

      post.media = [...post.media, ...newMediaArr];
    }

    await post.save();

    res.status(200).json({
      success: true,
      message: "Post updated successfully",
      post,
    });
  } catch (error) {
    console.error("Update post error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;

    if (!postId) {
      return res
        .status(400)
        .json({ success: false, message: "Post ID is required" });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    for (const m of post.media) {
      const filePath = m.url.split("/storage/v1/object/public/media/")[1];
      if (filePath) {
        const { error } = await supabase.storage
          .from("media")
          .remove([filePath]);
        if (error) console.error("Failed to delete media:", error.message);
      }
    }

    await post.deleteOne();

    res.status(200).json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (error) {
    console.error("Delete post error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    if (!post.likes.includes(req.user._id)) post.likes.push(req.user._id);
    await post.save();

    res.json({ message: "Post liked", likes: post.likes.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const sharePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    if (!post.shares.includes(req.user._id)) post.shares.push(req.user._id);
    await post.save();

    res.json({ message: "Post shared", shares: post.shares.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const pushShare = async (postId, userId) => {
  try {
    const postObjectId = new mongoose.Types.ObjectId(postId);
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const updatedPost = await Post.findByIdAndUpdate(
      postObjectId,
      { $addToSet: { shares: userObjectId } },
      { new: true }
    )

    console.log("✅ Updated Post:", updatedPost);
    return updatedPost;
  } catch (err) {
    console.error("❌ Error pushing share:", err.message);
    throw err;
  }
};


async function postToLinkedIn(accessToken, post,userId) {
  try {
    // Step 1: Get LinkedIn profile to obtain personId
    const profileResponse = await axios.get(
      "https://api.linkedin.com/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const personId = profileResponse.data.sub;
    if (!personId) {
      throw new Error("Could not retrieve LinkedIn person ID");
    }

    let mediaUrn = null;

    // Step 2: If post has media, upload first
    if (post.media && post.media.length > 0) {
      const firstMedia = post.media[0]; // LinkedIn only supports one media item per post
      if (firstMedia.type === "Image") {
        console.log("Uploading image to LinkedIn...");

        const registerUploadResponse = await axios.post(
          "https://api.linkedin.com/v2/assets?action=registerUpload",
          {
            registerUploadRequest: {
              owner: `urn:li:person:${personId}`,
              recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
              serviceRelationships: [
                {
                  relationshipType: "OWNER",
                  identifier: "urn:li:userGeneratedContent",
                },
              ],
              supportedUploadMechanism: ["SYNCHRONOUS_UPLOAD"],
            },
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        const uploadUrl =
          registerUploadResponse.data.value.uploadMechanism[
            "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
          ].uploadUrl;
        const asset = registerUploadResponse.data.value.asset;

        // 2.2 Upload actual file
        // 2.2 Upload actual file
        const imageResponse = await axios.get(firstMedia.url, {
          responseType: "arraybuffer",
        });
        const imageBuffer = Buffer.from(imageResponse.data);

        await axios.put(uploadUrl, imageBuffer, {
          headers: {
            "Content-Type": "image/png", // adjust based on type
          },
        });

        mediaUrn = asset;
      }
      // ⚠️ For Video/Document → LinkedIn requires different upload endpoints
      // You’d need separate handling (can add if you want).
    }

    // Step 3: Prepare body
    const postBody = {
      author: `urn:li:person:${personId}`,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text: post.description || "Check out this post!",
          },
          shareMediaCategory: post.media?.length > 0 ? "IMAGE" : "ARTICLE",
          media: [],
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    };

    if (mediaUrn) {
      // Image case
      postBody.specificContent["com.linkedin.ugc.ShareContent"].media.push({
        status: "READY",
        media: mediaUrn,
        description: { text: post.description },
        title: { text: post.title },
      });
    } else if (post.url) {
      postBody.specificContent[
        "com.linkedin.ugc.ShareContent"
      ].shareMediaCategory = "ARTICLE";
      postBody.specificContent["com.linkedin.ugc.ShareContent"].media.push({
        status: "READY",
        originalUrl: post.url,
        description: { text: post.description },
        title: { text: post.title },
      });
    }

    const response = await axios.post(
      "https://api.linkedin.com/v2/ugcPosts",
      postBody,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
      }
    );

    console.log("✅ LinkedIn Post Successful:", response.data);

    await pushShare(post._id,userId)
    
    return response.data;
  } catch (error) {
    console.error(
      "❌ LinkedIn API error:",
      error.response?.data || error.message
    );
    throw error;
  }
}

export const createLinkedInPost = async (req, res) => {
  try {
    const user = req.user;
    const { post } = req.body;

    if (!user.linkedinToken || !post) {
      return res
        .status(400)
        .json({ message: "accessToken and post are required" });
    }

    const result = await postToLinkedIn(user.linkedinToken, post, user._id);
    res
      .status(200)
      .json({ message: "Post created successfully", data: result });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to post to LinkedIn", error: error.message });
  }
};


