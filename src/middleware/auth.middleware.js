import jwt from "jsonwebtoken";
import User from "../models/User.js";

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

export const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }
   if (!token) return res.status(401).json({ message: "Not authorized" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");
    next();
  } catch (err) {
    res.status(401).json({ message: "Token invalid" });
  }
};

export const adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Admins only" });
  }
  next();
};

export const salespersonOnly = (req, res, next) => {
  if (req.user?.role !== "salesperson") {
    return res.status(403).json({ message: "Salespersons only" });
  }
  next();
};