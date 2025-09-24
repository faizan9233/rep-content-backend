import express from "express";
import { adminOnly, protect } from "../middleware/auth.middleware.js";
import { createSlackUserList, deleteSlackUserList, getSlackUserListById, getSlackUserLists, updateSlackUserList } from "../controller/slack.controller.js";

const slackRouter = express.Router();


slackRouter.post("/create-list",protect,adminOnly, createSlackUserList);
slackRouter.get("/get-all-lists",protect,adminOnly, getSlackUserLists);
slackRouter.get("/get-single-list/:id",protect,adminOnly, getSlackUserListById);
slackRouter.put("/update-list/:id",protect,adminOnly, updateSlackUserList);
slackRouter.delete("/delete-list/:id",protect,adminOnly, deleteSlackUserList);

export default slackRouter