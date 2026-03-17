import mongoose, { isValidObjectId } from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Like } from "../models/like.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
//Helper Function so that I don't need to write the same code again and agian
const toggleLikeHelper = async (req, res, requestId, requestType) => {
  try {
    // 1. check weather the video exist
    // 2. if no then send back the error
    // 3. if yes find it if liked before or not
    // 4. if yes then add a dislike
    // 5. register a new like
    if (!requestId) {
      throw new ApiError(401, `${requestType} doesn't exist`);
    }
    if (!isValidObjectId(requestId)) {
      throw new ApiError(400, `Invalid ${requestType} ID format`);
    }
    const query = {
      [requestType]: requestId,
      likedBy: req.user._id,
    };
    const existingLike = await Like.findOne(query);
    if (existingLike) {
      await Like.findByIdAndDelete(existingLike._id);
      return res
        .status(200)
        .json(
          new ApiResponse(
            201,
            { isLiked: false },
            `Like Removed Successfully from ${requestType}`
          )
        );
    }
    await Like.create(query);
    return res
      .status(200)
      .json(
        new ApiResponse(
          201,
          { isLiked: true },
          `Like Added Successfully to ${requestType}`
        )
      );
  } catch (err) {
    // This check if the error has to be solved by someone or you may say artificial
    // if yes then throw it upward until someone solve it
    // this is to protect the function from error masking due to which artificial errors will also be considered into the 500 banner or ultimate banner due to this catch block
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(500, "Like Helper Function Crashed", err);
  }
};

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  return await toggleLikeHelper(req, res, videoId, "video");
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  return await toggleLikeHelper(req, res, commentId, "comment");
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  return await toggleLikeHelper(req, res, tweetId, "tweet");
});

const getLikedVideos = asyncHandler(async (req, res) => {
  // access the database
  // check for all the video id's which I have I liked
  // now geather all data related to these videos
  // make an array of objects to store whole of this
  // sort the array in decending order to ease the frontend dev
  // send them in the ApiResponse in data option
  const likeDetails = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(req.user._id),
        video: { $exists: true },
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "videoDetails",
      },
    },
    {
      $unwind: "$videoDetails",
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $project: {
        _id: 1,
        "videoDetails._id": 1,
        "videoDetails.videoFile": 1,
        "videoDetails.thumbnail": 1,
        "videoDetails.title": 1,
        "videoDetails.duration": 1,
        "videoDetails.views": 1,
        "videoDetails.owner": 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(201, likeDetails, "Liked Videos fetched Successfully")
    );
});

export { toggleVideoLike, toggleCommentLike, toggleTweetLike, getLikedVideos };
