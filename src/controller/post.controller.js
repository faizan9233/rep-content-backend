import { supabase } from "../config/supabase-client.js";
import Post from "../models/Post.js";
import User from "../models/User.js";
import { v4 as uuidv4 } from "uuid";



export const createPost = async (req, res) => {
  try {
    const { title, description } = req.body;
    const createdBy = req.user?._id;

    if (!title) {
      return res.status(400).json({ success: false, message: "Title is required" });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: "At least one media file is required" });
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
        return res.status(500).json({ success: false, message: "Failed to upload media" });
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
    const posts = await Post.find()
      .populate("createdBy", "name email")
      .populate("likes", "name email")
      .populate("shares", "name email")
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({})

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)

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
      return res.status(400).json({ success: false, message: "Post ID is required" });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }
    if (title) post.title = title;
    if (description) post.description = description;

    let mediaToKeep = [];
    if (existingMedia) {
      try {
        mediaToKeep = JSON.parse(existingMedia); 
      } catch (err) {
        console.error("Error parsing existingMedia:", err);
        return res.status(400).json({ success: false, message: "Invalid existingMedia format" });
      }
    }

    const mediaToDelete = post.media.filter(
      (m) => !mediaToKeep.find((keep) => keep.url === m.url)
    );

    for (const m of mediaToDelete) {
      const filePath = m.url.split("/storage/v1/object/public/media/")[1];
      if (filePath) {
        const { error } = await supabase.storage.from("media").remove([filePath]);
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
          return res.status(500).json({ success: false, message: "Failed to upload media" });
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
      return res.status(400).json({ success: false, message: "Post ID is required" });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    for (const m of post.media) {
      const filePath = m.url.split("/storage/v1/object/public/media/")[1];
      if (filePath) {
        const { error } = await supabase.storage.from("media").remove([filePath]);
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