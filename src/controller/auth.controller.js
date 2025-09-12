import User from "../models/User.js";
import jwt from "jsonwebtoken";
import axios from "axios";
import querystring from "querystring";
import { Frontend_url } from "../config/data.js";
import dotenv from "dotenv";
import { Client } from "@hubspot/api-client";
import SlackWorkspace from "../models/SlackWorkspace.js";
import Admin from "../models/Admin.js";
import Invite from "../models/Invite.js";
import crypto from "crypto";
import Company from "../models/Company.js";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
};

export const createSuperAdmin = async (req, res) => {
  try {
    const { name, email, password, companyName } = req.body;

    // Check if superadmin already exists
    const existingSuperAdmin = await Admin.findOne({ role: "superadmin" });
    if (existingSuperAdmin) {
      return res.status(400).json({ message: "Superadmin already exists" });
    }

    // Create superadmin
    const superadmin = await Admin.create({
      name,
      email,
      password,
      role: "superadmin",
    });

    // Create company and link superadmin as owner
    const company = await Company.create({
      name: companyName,
      owner: superadmin._id,
      admins: [superadmin._id],
      users: [],
    });

    // Link company to superadmin
    superadmin.company = company._id;
    await superadmin.save();

    res.status(201).json({ superadmin, company });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createInvite = async (req, res) => {
  try {
    const token = crypto.randomBytes(20).toString("hex");
    // Create invite linked to admin and admin's company
    const invite = await Invite.create({
      token,
      admin: req.user._id,
      company: req.user.company,
    });

    const signupLink = `${Frontend_url}/signup?token=${token}`;

    res.status(201).json({
      success: true,
      message: "Invite created successfully",
      link: signupLink,
    });
  } catch (err) {
    console.error("Create invite error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const emailSignUp = async (req, res) => {
  try {
    const { email, password, name, inviteToken } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email & password required" });
    }

    // Find the invite
    let invite;
    if (inviteToken) {
      invite = await Invite.findOne({ token: inviteToken });
      if (!invite) {
        return res.status(400).json({ message: "Invalid or expired invite" });
      }
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Create user linked to company/admin from invite
    const user = await User.create({
      email,
      password,
      name,
      role: "salesperson",
      admin: invite?.admin || null,
      company: invite?.company || null,
    });

    // Add user to company.users array if invite exists
    if (invite?.company) {
      await Company.findByIdAndUpdate(invite.company, {
        $addToSet: { users: user._id },
      });
    }

    const token = generateToken(user);

    res.status(201).json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        admin: user.admin,
        company: user.company,
      },
      token,
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ message: err.message });
  }
};

export const adminEmailSignUp = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email & password required" });

    const existingUser = await Admin.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email already exists" });

    const user = await Admin.create({ email, password, name });
    const token = generateToken(user);
    res.status(201).json({ user, token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const emailLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email & password required" });
    }

    let account = await User.findOne({ email });
    let accountType = "user";

    if (!account) {
      account = await Admin.findOne({ email });
      accountType = "admin";
    }

    if (!account) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await account.comparePassword(password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = generateToken(account);

    res.json({
      success: true,
      message: "Login successful",
      accountType,
      user: {
        id: account._id,
        name: account.name,
        email: account.email,
        role: account.role,
      },
      token,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: err.message });
  }
};

export const promoteUser = async (req, res) => {
  try {
    const { userId } = req.body;

    if (req.user.role !== "superadmin") {
      return res
        .status(403)
        .json({ message: "Only superadmin can promote users" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const newAdmin = await Admin.create({
      email: user.email,
      name: user.name,
      password: user.password || undefined,
      company: user.company,
      zohoId: user.zohoId || undefined,
      zohoToken: user.zohoToken || undefined,
      hubspotId: user.hubspotId || undefined,
      hubspotToken: user.hubspotToken || undefined,
    });

    await user.deleteOne();

    res.json({ message: "User promoted to admin", admin: newAdmin });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const demoteUser = async (req, res) => {
  try {
    const { userId } = req.body;

    if (req.user.role !== "superadmin") {
      return res
        .status(403)
        .json({ message: "Only superadmin can demote admins" });
    }

    const admin = await Admin.findById(userId);
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    const newUser = await User.create({
      email: admin.email,
      name: admin.name,
      password: admin.password || undefined,
      role: "salesperson",
      company: admin.company,
      zohoId: admin.zohoId || undefined,
      zohoToken: admin.zohoToken || undefined,
      hubspotId: admin.hubspotId || undefined,
      hubspotToken: admin.hubspotToken || undefined,
    });

    await admin.deleteOne();

    res.json({ message: "Admin demoted to user", user: newUser });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const hubspotAuth = async (req, res) => {
  const { token } = req.query;
  const authUrl = `https://app.hubspot.com/oauth/authorize?client_id=${
    process.env.HUBSPOT_CLIENT_ID
  }&redirect_uri=${encodeURIComponent(
    process.env.HUBSPOT_REDIRECT_URI
  )}&scope=oauth&state=${token || ""}`;
  res.redirect(authUrl);
};

export const hubspotcallback = async (req, res) => {
  try {
    const { code, state } = req.query;
    const hubspotClient = new Client();

    // Exchange code for token
    const response = await hubspotClient.oauth.tokensApi.create(
      "authorization_code",
      code,
      process.env.HUBSPOT_REDIRECT_URI,
      process.env.HUBSPOT_CLIENT_ID,
      process.env.HUBSPOT_CLIENT_SECRET
    );

    const { accessToken } = response;

    // Fetch user info
    const userInfo = await hubspotClient.apiRequest({
      method: "GET",
      path: `/oauth/v1/access-tokens/${accessToken}`,
    });
    const data = await userInfo.json();

    const hubspotId = data.hub_id;
    const email = data.user;
    const userId = data.user_id;

    // Fetch owner info for name
    const ownerInfo = await hubspotClient.apiRequest({
      method: "GET",
      path: `/crm/v3/owners/${userId}`,
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const ownerData = await ownerInfo.json();
    const fullName = `${ownerData.firstName || ""} ${
      ownerData.lastName || ""
    }`.trim();

    let adminId, company, invite;
    if (state) {
      invite = await Invite.findOne({ token: state });
      if (invite) {
        adminId = invite.admin;
        company = invite.company;
      }
    }

    // 🔍 Check in User first
    let user = await User.findOne({ hubspotId });
    let admin = null;

    if (!user) {
      // 🔍 If not found in User, check Admin
      admin = await Admin.findOne({ hubspotId });
    }

    if (user) {
      // Update User
      user.email = user.email || email;
      user.name = user.name || fullName || email;
      user.hubspotToken = accessToken;

      if (adminId && !user.admin) user.admin = adminId;
      if (company && !user.company) user.company = company;

      await user.save();
    } else if (admin) {
      // Update Admin
      admin.email = admin.email || email;
      admin.name = admin.name || fullName || email;
      admin.hubspotToken = accessToken;

      if (company && !admin.company) admin.company = company;

      await admin.save();
    } else {
      // Create fresh User
      user = await User.create({
        hubspotId,
        email,
        name: fullName || email,
        admin: adminId,
        company,
        hubspotToken: accessToken,
      });
    }

    // Link company to user/admin
    if (invite?.company) {
      await Company.findByIdAndUpdate(invite.company, {
        $addToSet: { users: user?._id || admin?._id },
      });
    }

    const token = generateToken(user || admin);

    res.redirect(
      `${Frontend_url}/setup?token=${token}&role=${
        user ? user.role : admin.role
      }`
    );
  } catch (err) {
    console.error("HubSpot OAuth error:", err.response?.data || err.message);
    res.status(500).json({ message: err.response?.data || err.message });
  }
};

export const zohoAuth = async (req, res) => {
  const { token } = req.query;
  const scope = "aaaserver.profile.READ";

  const authUrl = `https://accounts.zoho.com/oauth/v2/auth?scope=${scope}&client_id=${
    process.env.ZOHO_CLIENT_ID
  }&response_type=code&access_type=offline&redirect_uri=${encodeURIComponent(
    process.env.ZOHO_REDIRECT_URI
  )}&state=${token || ""}`;

  res.redirect(authUrl);
};

export const zohoCallback = async (req, res) => {
  try {
    const { code, state } = req.query;

    const ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID;
    const ZOHO_CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET;
    const REDIRECT_URI = process.env.ZOHO_REDIRECT_URI;
    const FRONTEND_URL = Frontend_url;

    // 🔑 Exchange code for access token
    const tokenResponse = await axios.post(
      "https://accounts.zoho.com/oauth/v2/token",
      null,
      {
        params: {
          code,
          client_id: ZOHO_CLIENT_ID,
          client_secret: ZOHO_CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          grant_type: "authorization_code",
        },
      }
    );

    const accessToken = tokenResponse.data.access_token;

    // 👤 Fetch user info from Zoho
    const userResponse = await axios.get(
      "https://accounts.zoho.com/oauth/user/info",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const zohoUser = userResponse.data;

    // 🎯 Handle invite state
    let adminId, company, invite;
    if (state) {
      invite = await Invite.findOne({ token: state });
      if (invite) {
        adminId = invite.admin;
        company = invite.company;
      }
    }

    // 🔍 First try User
    let user = await User.findOne({ zohoId: zohoUser.ZUID });
    let admin = null;

    if (!user) {
      // If not in User, check Admin
      admin = await Admin.findOne({ zohoId: zohoUser.ZUID });
    }

    if (user) {
      // Update User
      user.email = user.email || zohoUser.Email;
      user.name = user.name || zohoUser.Display_Name;
      user.zohoToken = accessToken;

      if (adminId && !user.admin) user.admin = adminId;
      if (company && !user.company) user.company = company;

      await user.save();
    } else if (admin) {
      // Update Admin
      admin.email = admin.email || zohoUser.Email;
      admin.name = admin.name || zohoUser.Display_Name;
      admin.zohoToken = accessToken;

      if (company && !admin.company) admin.company = company;

      await admin.save();
    } else {
      // Create fresh User
      user = await User.create({
        zohoId: zohoUser.ZUID,
        email: zohoUser.Email,
        name: zohoUser.Display_Name,
        admin: adminId,
        company,
        zohoToken: accessToken,
      });
    }

    // 📌 Link user/admin to company
    if (invite?.company) {
      await Company.findByIdAndUpdate(invite.company, {
        $addToSet: { users: user?._id || admin?._id },
      });
    }

    // 🎟️ Generate JWT
    const token = generateToken(user || admin);

    res.redirect(`${FRONTEND_URL}/setup?token=${token}&role=${user ? user.role : admin.role}`);
  } catch (err) {
    console.error("Zoho OAuth error:", err.response?.data || err.message);
    res.status(500).json({ message: err.response?.data || err.message });
  }
};

export const linkedinAuth = async (req, res) => {
  const userEmail = req.query.us;
  const authUrl =
    "https://www.linkedin.com/oauth/v2/authorization?" +
    querystring.stringify({
      response_type: "code",
      client_id: process.env.LINKEDIN_CLIENT_ID,
      redirect_uri: process.env.LINKEDIN_REDIRECT_URI,
      scope: "openid profile w_member_social email",
      state: userEmail,
    });

  res.redirect(authUrl);
};

export const linkedinCallback = async (req, res) => {
  try {
    const { code, state } = req.query;
    const userEmail = state;

    const tokenRes = await axios.post(
      "https://www.linkedin.com/oauth/v2/accessToken",
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.LINKEDIN_REDIRECT_URI,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const accessToken = tokenRes.data.access_token;

    const userInfoRes = await axios.get(
      "https://api.linkedin.com/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const linkedinId = userInfoRes.data.sub;
    const linkedinName = userInfoRes.data.name;
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.linkedinId = linkedinId;
    user.linkedinToken = accessToken;
    user.linkedinName = linkedinName;
    user.linkedinProfilePic = userInfoRes.data.picture;
    await user.save();

    res.redirect(`${Frontend_url}/dashboard/content?linkAuth=${true}}`);
  } catch (err) {
    console.error(
      "LinkedIn callback error:",
      err.response?.data || err.message
    );
    res.redirect(`${Frontend_url}/dashboard/content`);
  }
};

export const checkLinkedinAuth = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "No logged-in user" });
    }

    if (req.user.linkedinId && req.user.linkedinToken) {
      return res.json({
        authenticated: true,
        message: "User is authenticated with LinkedIn",
        linkedinId: req.user.linkedinId,
      });
    }

    return res.json({
      authenticated: false,
      message: "User is not authenticated with LinkedIn",
    });
  } catch (err) {
    console.error("Error checking LinkedIn auth:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const slackRedirect = (req, res) => {
  const { userId } = req.query;

  const url = `https://slack.com/oauth/v2/authorize?client_id=${
    process.env.SLACK_CLIENT_ID
  }
      &scope=chat:write,users:read,users:read.email
      &redirect_uri=${encodeURIComponent(process.env.SLACK_REDIRECT_URI)}
      &state=${userId}`;

  res.redirect(url);
};

export const slackCallback = async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).json({ error: "Missing authorization code" });
    }

    const tokenRes = await axios.post(
      "https://slack.com/api/oauth.v2.access",
      null,
      {
        params: {
          code,
          client_id: process.env.SLACK_CLIENT_ID,
          client_secret: process.env.SLACK_CLIENT_SECRET,
          redirect_uri: process.env.SLACK_REDIRECT_URI,
        },
      }
    );

    const data = tokenRes.data;
    if (!data.ok) {
      return res
        .status(400)
        .json({ error: "Slack auth failed", details: data });
    }

    const { access_token, team, authed_user } = data;
    const teamId = team.id;
    const teamName = team.name;

    let installerEmail = null;
    let installerSlackId = null;

    try {
      const userRes = await axios.get("https://slack.com/api/users.info", {
        headers: { Authorization: `Bearer ${access_token}` },
        params: { user: authed_user.id },
      });

      const installer = userRes.data.user;
      installerEmail = installer?.profile?.email || null;
      installerSlackId = installer?.id || null;
    } catch (err) {
      console.warn("Could not fetch installer email:", err.message);
    }

    // 3️⃣ Find user in DB
    let linkedUser = null;

    if (state) {
      // Case 1: install started in your app → state contains userId
      linkedUser = await Admin.findById(state);
    } else if (installerEmail) {
      // Case 2: install started from Slack directory → match by email
      linkedUser = await Admin.findOne({ email: installerEmail });
    }

    let workspace = await SlackWorkspace.findOne({ teamId });
    if (!workspace) {
      workspace = new SlackWorkspace({ teamId });
    }

    workspace.teamName = teamName;
    workspace.botToken = access_token;
    workspace.installedBy = {
      slackUserId: installerSlackId,
      email: installerEmail,
    };
    workspace.linkedUser = linkedUser?._id || null;

    await workspace.save();

    if (linkedUser) {
      return res.redirect(
        `${Frontend_url}/admin-dashboard/upload?user=${linkedUser._id}&team=${teamId}`
      );
    } else {
      return res.redirect(
        `${Frontend_url}/admin-dashboard/upload?pending=true&team=${teamId}`
      );
    }
  } catch (err) {
    console.error("Slack OAuth error:", err);
    res.status(500).json({ error: "Slack OAuth failed" });
  }
};
