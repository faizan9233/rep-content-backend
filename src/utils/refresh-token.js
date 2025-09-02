import User from "../models/User.js";

export const refreshLinkedInToken = async (userId) => {
  const user = await User.findById(userId);
  if (!user || !user.linkedinRefreshToken) throw new Error("No LinkedIn refresh token found");

  const res = await axios.post(
    "https://www.linkedin.com/oauth/v2/accessToken",
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: user.linkedinRefreshToken,
      client_id: process.env.LINKEDIN_CLIENT_ID,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET,
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  user.linkedinToken = res.data.access_token;
  await user.save();
  return user.linkedinToken;
};