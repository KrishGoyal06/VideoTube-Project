import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { Tweet } from "../models/tweet.model.js";

const createTweet = asyncHandler(async (req, res) => {
  // TODO: create tweet
  /*
    1.Take all the content
    2.Check if it is empty or not
    3.Add the data in the tweet content slot
    4.Add user data into the owner option
  */
  const { content } = req.body;
  if (!content || content.trim() === "") {
    throw new ApiError(401, "Tweet is empty");
  }
  const newTweet = await Tweet.create({
    content: content,
    owner: req.user._id,
  });

  return res
    .status(200)
    .json(new ApiResponse(201, newTweet, "Tweet is created successfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  if (!tweetId) {
    throw new ApiError(401, "Tweet doesn't exist");
  }
  if (!isValidObjectId(tweetId)) {
    throw new ApiError(401, "Invalid Tweet Id Given");
  }
  const deletedTweet = await Tweet.findOneAndDelete({
    _id: tweetId,
    owner: req.user._id,
  });
  if (!deletedTweet) {
    throw new ApiError(401, "Tweet doesn't belong to the user");
  }
  return res
    .status(200)
    .json(new ApiResponse(201, {}, "Tweet successfully deleted"));
});

const updateTweet = asyncHandler(async (req, res) => {
  //TODO: update tweet
  const { tweetId } = req.params;
  if (!tweetId) {
    throw new ApiError(400, "Tweet doesn't exist");
  }
  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet id given");
  }
  const { content } = req.body;
  if (!content || content.trim() === "") {
    throw new ApiError(400, "Please enter valid content");
  }
  const tweet = await Tweet.findOne({
    _id: tweetId,
    owner: req.user._id,
  });
  if (!tweet) {
    throw new ApiError(400, "This tweet doesn't belongs to you");
  }
  tweet.content = content;
  await tweet.save({ validateBeforeSave: true });
  return res
    .status(200)
    .json(new ApiResponse(200, tweet, "Tweet has been updated"));
});

const getUserTweets = asyncHandler(async (req, res) => {
  // TODO: get user tweets
  const user = req.user;
  const tweets = await Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(user._id),
      },
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
      $sort: {
        createdAt: -1,
      },
    },
    {
      $project: {
        _id: 1,
        content: 1,
        createdAt: 1,
        "ownerDetails.username": 1,
        "ownerDetails.fullName": 1,
        "ownerDetails.avatar": 1,
        "ownerDetails.email": 1,
      },
    },
  ]);
  return res
    .status(200)
    .json(new ApiResponse(201, tweets, "Tweets Fetched Successfully"));
});

export { createTweet, deleteTweet, getUserTweets, updateTweet };
