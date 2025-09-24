import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import path from "path";
import { fileURLToPath } from 'url';
import connectDB from './config/database.js';
import router from "./routes/auth.routes.js";
import postRouter from "./routes/post.routes.js";
import adminRouter from "./routes/admin.routes.js";
import slackRouter from "./routes/slack.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class App {
  constructor() {  
    dotenv.config()
    this.app = express();
    this.app.use(express.json());
    this.http = new http.Server(this.app);
    this.PORT = process.env.PORT || 8000;
    this.initMiddleware();
    this.initDatabase();
    this.initRoutes();
  }

  initMiddleware() {
    this.app.use(cors());
    this.app.use(
      (req, res, next) => {
        if (req.originalUrl.includes("stripe")) {
          next();
        } else {
          express.json()(req, res, next);
        }
      }
    );
  }

  async initDatabase() {
    await connectDB();
  }

  initRoutes() {
    const publicPath = path.join(__dirname, "..", "public");
    this.app.use(express.static(publicPath));
    this.app.use("/api/auth", router);
    this.app.use("/api/post", postRouter);
    this.app.use("/api/admin", adminRouter);
    this.app.use("/api/slack", slackRouter);
  }

  createServer() {
    this.http.listen(this.PORT, () => {
      console.log("Server started at port " + this.PORT);
    });
  }
}