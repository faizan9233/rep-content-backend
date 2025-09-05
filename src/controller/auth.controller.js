import User from "../models/User.js";
import jwt from "jsonwebtoken";
import axios from "axios";
import querystring from "querystring";
import { Frontend_url } from "../config/data.js";
import dotenv from "dotenv";
import { Client } from "@hubspot/api-client";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
};

export const emailSignUp = async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email & password required" });

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email already exists" });

    const user = await User.create({ email, password, name, role });
    const token = generateToken(user);
    res.status(201).json({ user, token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const emailLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email & password required" });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "Invalid email or password" });

    const isMatch = await user.comparePassword(password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid email or password" });

    const token = generateToken(user);
    res.json({ user, token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const hubspotAuth = async (req, res) => {
  const authUrl = `https://app.hubspot.com/oauth/authorize?client_id=${
    process.env.HUBSPOT_CLIENT_ID
  }&redirect_uri=${encodeURIComponent(
    process.env.HUBSPOT_REDIRECT_URI
  )}&scope=oauth`;
  res.redirect(authUrl);
};

export const hubspotcallback = async (req, res) => {
  try {
    const { code } = req.query;
   const hubspotClient = new Client();
   const response = await hubspotClient.oauth.tokensApi.create(
      'authorization_code',
      code,
      process.env.HUBSPOT_REDIRECT_URI,
      process.env.HUBSPOT_CLIENT_ID,
      process.env.HUBSPOT_CLIENT_SECRET
    );

    const { accessToken } = response;

    const userInfo = await hubspotClient.apiRequest({
      method: 'GET',
      path: '/oauth/v1/access-tokens/' + accessToken
    });

    const data = await userInfo.json();
   const hubspotId = data.hub_id; 

    let user = await User.findOne({ hubspotId });
    if (!user) {
      user = await User.create({ hubspotId, email:data.user });
    }

    const token = generateToken(user);
    res.redirect(`${Frontend_url}/setup?token=${token}`);
  } catch (err) {
    console.error("HubSpot OAuth error:", err.response?.data || err.message);
    res.status(500).json({ message: err.response?.data || err.message });
  }
};

export const zohoAuth = async (req, res) => {
  // Scope to access user info
  // const scope = "ZohoCRM.settings.READ"; // instead of ZohoCRM.modules.ALL
  const authUrl = `https://accounts.zoho.com/oauth/v2/auth&client_id=${
    process.env.ZOHO_CLIENT_ID
  }&response_type=code&access_type=offline&redirect_uri=${encodeURIComponent(
    process.env.ZOHO_REDIRECT_URI
  )}`;
  res.redirect(authUrl);
};


export const zohoCallback = async (req, res) => {
  try {
    const { code } = req.query; 

    const ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID;
    const ZOHO_CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET;
    const REDIRECT_URI = process.env.ZOHO_REDIRECT_URI;
    const FRONTEND_URL = process.env.FRONTEND_URL;

    const tokenResponse = await axios.post(
      `https://accounts.zoho.com/oauth/v2/token`,
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

    const userResponse = await axios.get(
      "https://www.zohoapis.com/crm/v2/users",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const zohoUser = userResponse.data.users[0];

    let user = await User.findOne({ zohoId: zohoUser.id });
    if (!user) {
      user = await User.create({
        zohoId: zohoUser.id,
        email: zohoUser.email,
        name: zohoUser.full_name,
      });
    }

    const token = generateToken(user);

    res.redirect(`${FRONTEND_URL}/setup?token=${token}`);
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
  
    const userInfoRes = await axios.get("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const linkedinId = userInfoRes.data.sub;
     const linkedinName = userInfoRes.data.name; 
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.linkedinId = linkedinId;
    user.linkedinToken = accessToken;
    user.linkedinName = linkedinName;
    user.linkedinProfilePic = userInfoRes.data.picture
    await user.save();

    res.redirect(
      `${Frontend_url}/dashboard/content?linkAuth=${true}}`
    );
  } catch (err) {
    console.error("LinkedIn callback error:", err.response?.data || err.message);
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

const CLIENT_ID = process.env.SLACK_CLIENT_ID;
const CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET;
const REDIRECT_URI = process.env.SLACK_REDIRECT_URI;

export const slackRedirect = (req, res) => {
  const url = `https://slack.com/oauth/v2/authorize?scope=identity.basic,users:read&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}`;
  res.redirect(url);
};

export const slackCallback = async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send("No code provided");

  try {
    const tokenResponse = await axios.post(
      "https://slack.com/api/oauth.v2.access",
      null,
      {
        params: {
          code,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
        },
      }
    );

    const { authed_user } = tokenResponse.data;
    if (!authed_user) return res.status(400).send("Slack auth failed");

    const slackId = authed_user.id;
    const accessToken = authed_user.access_token;

    const user = await User.findOne({ email: req.user.email });
    if (!user) return res.status(404).send("User not found");

    user.slackId = slackId;
    user.slackAccessToken = accessToken;
    await user.save();

    res.send("Slack account connected successfully!");
  } catch (err) {
    console.error(err);
    res.status(500).send("Slack auth error");
  }
};
