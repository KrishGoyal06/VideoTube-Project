import mongoose, { isValidObjectId } from "mongoose";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  // TODO: toggle subscription
  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Channel ID format error");
  }
  if (channelId === req.user._id.toString()) {
    throw new ApiError(400, "You cannot Subscribe to Yourself");
  }
  const existingSubscriber = await Subscription.findOne({
    channel: channelId,
    subscriber: req.user._id,
  });
  if (existingSubscriber) {
    await Subscription.findByIdAndDelete(existingSubscriber._id);
    return res
      .status(200)
      .json(
        new ApiResponse(200, { subscriber: false }, "Unsubscribed Successfully")
      );
  }
  const newSubscriber = await Subscription.create({
    channel: channelId,
    subscriber: req.user._id,
  });
  return res
    .status(200)
    .json(
      new ApiResponse(200, { subscriber: true }, "Subscribed Successfully")
    );
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Channel ID is not in correct Format");
  }
  const { page = 1, limit = 10 } = req.query;
  const pageCount = parseInt(page, 10) || 1;
  const limitCount = parseInt(limit, 10) || 10;
  const skipCount = (pageCount - 1) * limitCount;

  const subs = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $facet: {
        //Powerfull Tool can use multiple pipelines at a same time
        subscriberList: [
          //PipeLine 1: Find the list with perfect Pagination
          { $sort: { createdAt: -1 } },
          { $skip: skipCount },
          { $limit: limitCount },
          {
            $lookup: {
              from: "users",
              localField: "subscriber",
              foreignField: "_id",
              as: "subscriberDetails",
            },
          },
          {
            $project: {
              _id: 0,
              subscriber: {
                $first: "$subscriberDetails",
              },
            },
          },
          {
            $project: {
              username: "$subscriber.username",
              fullName: "$subscriber.fullName",
              avatar: "$subscriber.avatar",
            },
          },
        ],
        // Pipeline 2: Count the absolute total number of matches
        subscriberCount: [{ $count: "count" }],
      },
    },
  ]);
  const subsList = subs[0].subscriberList;
  const totalCount = subs[0].subscriberCount[0]?.count || 0;
  const hasNextPage = totalCount > skipCount + limitCount;
  const payload = { subsList, totalCount, hasNextPage };
  return res
    .status(200)
    .json(new ApiResponse(200, payload, "Subscribers Successfully Fetched"));
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;
  if (!isValidObjectId(subscriberId)) {
    throw new ApiError(400, "Subscriber ID is not is correct Format");
  }
  const { page = 1, limit = 10 } = req.query;
  const pageCount = parseInt(page, 10) || 1;
  const limitCount = parseInt(limit, 10) || 10;
  const skipCount = (pageCount - 1) * limitCount;
  const subscribedTo = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(subscriberId),
      },
    },
    {
      $facet: {
        channelList: [
          { $sort: { createdAt: -1 } },
          { $skip: skipCount },
          { $limit: limitCount },
          {
            $lookup: {
              from: "users",
              localField: "channel",
              foreignField: "_id",
              as: "details",
            },
          },
          {
            $project: {
              _id: 0,
              details: {
                $first: "$details",
              },
            },
          },
          {
            $project: {
              username: "$details.username",
              fullName: "$details.fullName",
              avatar: "$details.avatar",
            },
          },
        ],
        channelCount: [{ $count: "count" }],
      },
    },
  ]);
  const channels = subscribedTo[0].channelList;
  const totalCount = subscribedTo[0].channelCount[0]?.count || 0;
  const hasNextPage = totalCount > skipCount + limitCount;
  const payload = { channels, totalCount, hasNextPage };
  return res
    .status(200)
    .json(new ApiResponse(200, payload, "Subscriptions Successfully Fetched"));
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
