import express from 'express'
import { createLinkedInPost, createLinkPost, createPost, createUserLinkPost, deletePost, deleteUserPost, getAllPosts, getAllUserPosts, getAllUserPostsForAdmin, getAllUsers, getLinkedInPostDetails, getPostById, likePost, repostPost, updatePost, updateUserPostStatus } from "../controller/post.controller.js";
import { adminOnly, protect, salespersonOnly } from "../middleware/auth.middleware.js";
import { ShareL } from '../controller/main.controller.js';
import { uploadConfig } from '../config/multer.js';
import { SendBroadcast, slackUsers } from '../controller/slack.controller.js';


const postRouter = express.Router();

postRouter.post("/create", uploadConfig.array("media", 10), protect,adminOnly, createPost);
postRouter.post("/create-link-post",protect,adminOnly, createLinkPost);
postRouter.post("/create-user-link-post",protect,salespersonOnly, createUserLinkPost);
postRouter.put("/update",uploadConfig.array("media", 10), protect,adminOnly, updatePost);
postRouter.delete("/delete/:postId", protect,adminOnly, deletePost);
postRouter.delete("/delete-userpost/:postId", protect,salespersonOnly, deleteUserPost);
postRouter.put("/update-userpost/:postId", protect,adminOnly, updateUserPostStatus);
postRouter.post("/broadcast-slack-message", protect,adminOnly, SendBroadcast);
postRouter.get("/get-slack-users", protect,adminOnly, slackUsers);
postRouter.get("/get-single/:id", getPostById);
postRouter.post("/get-post-with-url", getLinkedInPostDetails);

postRouter.post("/share-post",protect, createLinkedInPost);
postRouter.post("/like-post",protect, likePost);
postRouter.post("/repost-post",protect, repostPost);

postRouter.get("/get-all",protect, getAllPosts);
postRouter.get("/get-all-user-posts",protect,salespersonOnly, getAllUserPosts);
postRouter.get("/get-all-user-posts-admin",protect,adminOnly, getAllUserPostsForAdmin);
postRouter.get("/get-all-users",protect,adminOnly, getAllUsers);




postRouter.get('/post/:postId',ShareL)

export default postRouter;