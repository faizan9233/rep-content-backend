import express from "express";
import { checkLinkedinAuth, createInvite, createSuperAdmin, demoteUser, emailLogin, emailSignUp, hubspotAuth, hubspotcallback, linkedinAuth, linkedinCallback, promoteUser, slackCallback, slackRedirect, zohoAuth, zohoCallback } from "../controller/auth.controller.js";
import { adminOnly, protect } from "../middleware/auth.middleware.js";
import User from "../models/User.js";
import SlackWorkspace from "../models/SlackWorkspace.js";
import Admin from "../models/Admin.js";

const router = express.Router();

router.post("/signup", emailSignUp);
//router.post("/admin-signup", adminEmailSignUp);
router.post("/login", emailLogin);

router.post("/promote-user",protect,adminOnly, promoteUser);
router.post("/demote-user",protect,adminOnly, demoteUser);


router.post("/create-invite",protect, createInvite);
router.post("/create-superadmin", createSuperAdmin);

router.get("/me", protect, async (req, res) => {
  try {
    let account;

    if (req.user.role === "admin" || req.user.role === "superadmin") {
      account = await Admin.findById(req.user.id).select("-password").populate("company", "name");
    } else {
      account = await User.findById(req.user.id).select("-password").populate("company", "name");;
    }

    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    res.json(account);
  } catch (err) {
    console.error("Me route error:", err);
    res.status(500).json({ message: err.message });
  }
});

router.get("/get-workspace", protect, async (req, res) => {
  try {
    const workspace = await SlackWorkspace.findOne({linkedUser:req.user.id})
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }
    res.json(workspace);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//hubspot
router.get("/hubspot/callback", hubspotcallback);
router.get("/hubspot/auth", hubspotAuth);

//zoho
router.get("/zoho/auth", zohoAuth);
router.get("/zoho/callback", zohoCallback);

//linkedin
router.get("/linkedin/auth", linkedinAuth);
router.get("/linkedin/callback", linkedinCallback);
router.get("/check-linkedin-auth",protect, checkLinkedinAuth);

//slack
router.get("/slack/auth", slackRedirect);
router.get("/slack/callback", slackCallback);

export default router;
