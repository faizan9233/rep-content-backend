import express from "express";
import { emailLogin, emailSignUp, hubspotAuth, hubspotcallback, linkedinAuth, linkedinCallback, slackCallback, slackRedirect, zohoAuth, zohoCallback } from "../controller/auth.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import User from "../models/User.js";

const router = express.Router();

router.post("/signup", emailSignUp);
router.post("/login", emailLogin);

router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//hubspot
router.post("/hubspot/callback", hubspotcallback);
router.get("/hubspot/auth", hubspotAuth);

//zoho
router.get("/zoho/auth", zohoAuth);
router.post("/zoho/callback", zohoCallback);

//linkedin
router.get("/linkedin/auth", linkedinAuth);
router.get("/linkedin/callback",protect, linkedinCallback);

//slack
router.get("/slack/auth", slackRedirect);
router.post("/slack/callback", slackCallback);

export default router;
