import express from "express";
import { adminOnly, protect } from "../middleware/auth.middleware.js";
import { createAutoBroadcast, createSlackUserList, deleteSlackUserList, getSlackUserListById, getSlackUserLists, getUserAutoBroadcasts, toggleAutoBroadcast, updateAutoBroadcast, updateSlackUserList } from "../controller/slack.controller.js";

const slackRouter = express.Router();


slackRouter.post("/create-list",protect,adminOnly, createSlackUserList);
slackRouter.get("/get-all-lists",protect,adminOnly, getSlackUserLists);
slackRouter.get("/get-single-list/:id",protect,adminOnly, getSlackUserListById);
slackRouter.put("/update-list/:id",protect,adminOnly, updateSlackUserList);
slackRouter.delete("/delete-list/:id",protect,adminOnly, deleteSlackUserList);

//auto broadcast
slackRouter.post("/create-auto-broadcast",protect,adminOnly, createAutoBroadcast);
slackRouter.put("/update-auto-broadcast/:id",protect,adminOnly, updateAutoBroadcast);
slackRouter.put("/toggle-auto-broadcast/:id",protect,adminOnly, toggleAutoBroadcast);
slackRouter.get("/get-auto-broadcast",protect,adminOnly, getUserAutoBroadcasts);

export default slackRouter