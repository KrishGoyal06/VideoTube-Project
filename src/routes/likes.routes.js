import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware";
import {
  toggleVideoLike,
  toggleCommentLike,
  toggleTweetLike,
  getLikedVideos,
} from "../controllers/likes.controllers.js";

const router = Router();
router.use(verifyJWT); //Apply the verifyJWT on all the routes

router.route("/toggle/t/:tweetId").post(toggleTweetLike);
router.route("/toggle/c/:commentId").post(toggleCommentLike);
router.route("/toggle/v/:videoId").post(toggleVideoLike);
router.route("/videos").get(getLikedVideos);
export default router;
