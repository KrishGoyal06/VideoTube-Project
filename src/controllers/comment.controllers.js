import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Video Id sent!!");
  }

  const pageCount = parseInt(page, 10);
  const limitCount = parseInt(limit, 10);
  const skipCount = (pageCount - 1) * limitCount;
  const comment = await Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $skip: skipCount,
    },
    {
      $limit: limitCount,
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
      },
    },
    {
      $unwind: "$ownerDetails",
    },
    {
      $project: {
        _id: 1,
        content: 1,
        createdAt: 1,
        "ownerDetails.username": 1,
        "ownerDetails.avatar": 1,
        "ownerDetails.fullName": 1,
      },
    },
  ]);
  return res.status(200).json(new ApiResponse(200, comment, "Last Comments"));
});

const addComment = asyncHandler(async (req, res) => {
  // TODO: add a comment to a video
  const { comment } = req.body;
  const { videoId } = req.params;
  if (!comment || comment.trim() === "") {
    throw new ApiError(401, "No Comment Added");
  }
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Wrong Video Id sent");
  }
  const newComment = await Comment.create({
    content: comment.trim(),
    video: videoId,
    owner: req.user._id,
  });
  if (!newComment) {
    throw new ApiError(
      400,
      "Something went wrong while creating a new comment"
    );
  }
  return res
    .status(200)
    .json(new ApiResponse(200, newComment, "New Comment Created Successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
  // TODO: update a comment
  const { content } = req.body;
  const { commentId } = req.params;
  if (!content || content.trim() === "") {
    throw new ApiError(400, "Comment is empty");
  }
  if (!commentId) {
    throw new ApiError(400, "Comment Id is not here");
  }
  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid Id format");
  }
  const comment = await Comment.findOne({
    _id: commentId,
    owner: req.user._id,
  });
  if (!comment) {
    throw new ApiError(400, "This comment doesn't belongs to the user");
  }
  comment.content = content;
  await comment.save({ validateBeforeSave: true });
  return res
    .status(200)
    .json(new ApiResponse(200, comment, "Comment Updated Successfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
  // TODO: delete a comment
  const { commentId } = req.params;
  if (!commentId) {
    throw new ApiError(400, "Comments doesn't exist");
  }
  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "The Id sent is not correct");
  }
  const deletedComment = await Comment.findOneAndDelete({
    _id: commentId,
    owner: req.user._id,
  });
  if (!deletedComment) {
    throw new ApiError(401, "Comment doesn't belong to the user");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "The Comment is deleted Successfully"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
