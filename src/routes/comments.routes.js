import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware";
import {
  getVideoComments,
  addComment,
  updateComment,
  deleteComment,
} from "../controllers/comment.controllers";

const router = Router();

router.use(verifyJWT);
// This is also not wrong way but using verbs in the url is not considered a good practice in industry and this makes more sense also

// router.route("/add-comment/c/:commnetId").post(addComment);
// router.route("/delete-comment/c/:commnetId").post(deleteComment);
// router.route("/update-comment/c/:commnetId").post(updateComment);
// router.route("/comments").post(getVideoComments);

// gets all the video comments and also option of adding a new one
router.route("/:videoId").get(getVideoComments).post(addComment);
// gives you the option of delete and update at a same time now its your choice
router.route("/c/:commentId").delete(deleteComment).patch(updateComment);

export default router;
