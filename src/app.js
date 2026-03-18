import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
const app = express();
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

//Import Routes
import userRoute from "./routes/users.routes.js";
import likeRoute from "./routes/likes.routes.js";
import commentRoute from "./routes/comments.routes.js";
//Routes calling
app.use("/api/v1/users", userRoute);
app.use("/api/v1/likes", likeRoute);
app.use("/api/v1/comment", commentRoute);
export { app };
