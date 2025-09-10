import express from 'express'
import { createLinkedInPost, createLinkPost, createPost, deletePost, getAllPosts, getAllUsers, getLinkedInPostDetails, getPostById, likePost, repostPost, updatePost } from "../controller/post.controller.js";
import { adminOnly, protect } from "../middleware/auth.middleware.js";
import { ShareL } from '../controller/main.controller.js';
import { uploadConfig } from '../config/multer.js';
import { SendBroadcast, slackUsers } from '../controller/slack.controller.js';


const postRouter = express.Router();

postRouter.post("/create", uploadConfig.array("media", 10), protect,adminOnly, createPost);
postRouter.post("/create-link-post",protect,adminOnly, createLinkPost);
postRouter.put("/update",uploadConfig.array("media", 10), protect,adminOnly, updatePost);
postRouter.delete("/delete/:postId", protect,adminOnly, deletePost);
postRouter.post("/broadcast-slack-message", protect,adminOnly, SendBroadcast);
postRouter.get("/get-slack-users", protect,adminOnly, slackUsers);
postRouter.get("/get-single/:id", getPostById);
postRouter.post("/get-post-with-url", getLinkedInPostDetails);

postRouter.post("/share-post",protect, createLinkedInPost);
postRouter.post("/like-post",protect, likePost);
postRouter.post("/repost-post",protect, repostPost);

postRouter.get("/get-all",protect, getAllPosts);
postRouter.get("/get-all-users",protect,adminOnly, getAllUsers);




postRouter.get('/post/:postId',ShareL)

export default postRouter;