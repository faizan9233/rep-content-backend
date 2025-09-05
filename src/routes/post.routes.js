import express from 'express'
import { createLinkedInPost, createPost, deletePost, getAllPosts, getAllUsers, getPostById, likePost, updatePost } from "../controller/post.controller.js";
import { adminOnly, protect } from "../middleware/auth.middleware.js";
import { ShareL } from '../controller/main.controller.js';
import { uploadConfig } from '../config/multer.js';


const postRouter = express.Router();

postRouter.post("/create", uploadConfig.array("media", 10), protect,adminOnly, createPost);
postRouter.put("/update",uploadConfig.array("media", 10), protect,adminOnly, updatePost);
postRouter.delete("/delete/:postId", protect,adminOnly, deletePost);
postRouter.get("/get-single/:id", getPostById);

postRouter.post("/share-post",protect, createLinkedInPost);

postRouter.get("/get-all",protect, getAllPosts);
postRouter.get("/get-all-users",protect,adminOnly, getAllUsers);



postRouter.post("/like/:id/", protect, likePost);

postRouter.get('/post/:postId',ShareL)

export default postRouter;