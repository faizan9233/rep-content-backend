import axios from "axios";
import SlackWorkspace from "../models/SlackWorkspace.js";
import Slackuserslist from "../models/Slackuserslist.js";

export const getSlackUsers = async (accessToken) => {
  try {
    const response = await axios.get("https://slack.com/api/users.list", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.data.ok) {
      throw new Error(response.data.error);
    }

    return response.data.members.filter(
      (member) => !member.is_bot && member.id !== "USLACKBOT" && !member.deleted
    );
  } catch (err) {
    console.error("Error fetching Slack users:", err.message);
    return [];
  }
};

export const slackUsers = async (req, res) => {
  try {
    const userId = req.user._id;

    const workspace = await SlackWorkspace.findOne({ linkedUser: userId });
    if (!workspace || !workspace.botToken) {
      return res
        .status(404)
        .json({ message: "Workspace or Slack token not found" });
    }

    const users = await getSlackUsers(workspace.botToken);

    res.json({ message: "✅ Users fetched successfully", users });
  } catch (err) {
    console.error("fetch Error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

export const sendSlackMessage = async (accessToken, userId, text) => {
  try {
    const response = await axios.post(
      "https://slack.com/api/chat.postMessage",
      {
        channel: userId,
        text,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.data.ok) {
      throw new Error(response.data.error);
    }

    return response.data;
  } catch (err) {
    console.error(`Error sending message to ${userId}:`, err.message);
  }
};

export const broadcastMessageToWorkspace = async (
  accessToken,
  message,
  users
) => {
  for (const user of users) {
    await sendSlackMessage(accessToken, user, message);
  }

  console.log(`✅ Message sent to ${users.length} users`);
};

export const SendBroadcast = async (req, res) => {
  try {
    const userId = req.user._id;
    const { message, users } = req.body;

    if (!message) {
      return res.status(400).json({ message: "Message is required" });
    }

    const workspace = await SlackWorkspace.findOne({ linkedUser: userId });
    if (!workspace || !workspace.botToken) {
      return res
        .status(404)
        .json({ message: "Workspace or Slack token not found" });
    }

    const response = await broadcastMessageToWorkspace(
      workspace.botToken,
      message,
      users
    );

    res.json({
      message: "✅ Message sent successfully",
      slackResponse: response,
    });
  } catch (err) {
    console.error("Broadcast Error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

export const createSlackUserList = async (req, res) => {
  try {
    const { name, userIds } = req.body;

    const workspace = await SlackWorkspace.findOne({
      linkedUser: req.user._id,
    });
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }
    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    const list = await Slackuserslist.create({
      name,
      userIds: userIds || [],
      workspaceId: workspace.teamId,
      admin: req.user._id,
      company: req.user.company,
    });

    res.status(201).json(list);
  } catch (error) {
    console.error("Error creating Slack user list:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const getSlackUserLists = async (req, res) => {
  try {
    const lists = await Slackuserslist.find({
      company: req.user.company,
      admin:req.user._id,
    }).sort({ createdAt: -1 });

    res.status(200).json(lists);
  } catch (error) {
    console.error("Error fetching Slack user lists:", error);
    res.status(500).json({ message: "Server error", error });
  }
};
 
export const getSlackUserListById = async (req, res) => {
  try {
    const list = await Slackuserslist.findOne({
      _id: req.params.id,
      company: req.user.company,
    });

    if (!list) {
      return res.status(404).json({ message: "List not found" });
    }

    res.status(200).json(list);
  } catch (error) {
    console.error("Error fetching Slack user list:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const updateSlackUserList = async (req, res) => {
  try {
    const { name, userIds } = req.body;

    const list = await Slackuserslist.findOneAndUpdate(
      { _id: req.params.id, company: req.user.company },
      { name, userIds },
      { new: true }
    );

    if (!list) {
      return res.status(404).json({ message: "List not found" });
    }

    res.status(200).json(list);
  } catch (error) {
    console.error("Error updating Slack user list:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const deleteSlackUserList = async (req, res) => {
  try {
    const list = await Slackuserslist.findOneAndDelete({
      _id: req.params.id,
      company: req.user.company,
    });

    if (!list) {
      return res.status(404).json({ message: "List not found" });
    }
    res.status(200).json({ message: "List deleted successfully" });
  } catch (error) {
    console.error("Error deleting Slack user list:", error);
    res.status(500).json({ message: "Server error", error });
  }
};
