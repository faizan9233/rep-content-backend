import User from "../models/User.js";
import jwt from "jsonwebtoken";
import axios from "axios";
import querystring from "querystring";

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
    const { code } = req.body;
    const HUBSPOT_CLIENT_ID = process.env.HUBSPOT_CLIENT_ID;
    const HUBSPOT_CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET;
    const REDIRECT_URI = process.env.HUBSPOT_REDIRECT_URI;

    const tokenResponse = await axios.post(
      `https://api.hubapi.com/oauth/v1/token`,
      new URLSearchParams({
        grant_type: "authorization_code",
        client_id: HUBSPOT_CLIENT_ID,
        client_secret: HUBSPOT_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        code,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const accessToken = tokenResponse.data.access_token;
    const me = await axios.get(
      "https://api.hubapi.com/oauth/v1/access-tokens/me",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const userInfo = await axios.get(
      `https://api.hubapi.com/crm/v3/owners/${me.data.user_id}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const email = userInfo.data.email;

    let user = await User.findOne({ hubspotId: me.data.user_id });
    if (!user) {
      user = await User.create({
        hubspotId: me.data.user_id,
        email,
      });
    }

    const token = generateToken(user);
    res.json({ user, token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const zohoAuth = async (req, res) => {
  const authUrl = `https://accounts.zoho.com/oauth/v2/auth?scope=ZohoCRM.modules.ALL&client_id=${
    process.env.ZOHO_CLIENT_ID
  }&response_type=code&access_type=offline&redirect_uri=${encodeURIComponent(
    process.env.ZOHO_REDIRECT_URI
  )}`;
  res.redirect(authUrl);
};

export const zohoCallback = async (req, res) => {
  try {
    const { code } = req.body;
    const ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID;
    const ZOHO_CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET;
    const REDIRECT_URI = process.env.ZOHO_REDIRECT_URI;

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
    const me = await axios.get("https://www.zohoapis.com/crm/v2/users", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    let user = await User.findOne({ zohoId: me.data.users[0].id });
    if (!user) user = await User.create({ zohoId: me.data.users[0].id });

    const token = generateToken(user);
    res.json({ user, token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const linkedinAuth = async (req, res) => {
  const authUrl =
    `https://www.linkedin.com/oauth/v2/authorization?` +
    querystring.stringify({
      response_type: "code",
      client_id: process.env.LINKEDIN_CLIENT_ID,
      redirect_uri: process.env.LINKEDIN_REDIRECT_URI,
      scope: "openid profile w_member_social", // Added w_member_social
    });

  res.redirect(authUrl);
};

export const linkedinCallback = async (req, res) => {
  try {
    const { code } = req.query;

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
    const refreshToken = tokenRes.data.refresh_token;

    // Use OpenID Connect userinfo endpoint
    const userInfoRes = await axios.get(
      "https://api.linkedin.com/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const linkedinId = userInfoRes.data.sub; // sub is the user ID

    if (!req.user) {
      return res.status(401).json({ message: "No logged-in user" });
    }

    req.user.linkedinId = linkedinId;
    req.user.linkedinToken = accessToken;
    req.user.linkedinRefreshToken = refreshToken;
    await req.user.save();

    res.json({
      message: "LinkedIn connected successfully",
      user: req.user,
      userInfo: userInfoRes.data,
    });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ message: "LinkedIn auth failed" });
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
