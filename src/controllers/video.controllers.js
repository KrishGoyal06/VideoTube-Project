import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Video } from "../models/video.model.js";
import {
  cloudinaryFileUploader,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import mongoose, { isValidObjectId } from "mongoose";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  if (userId && !isValidObjectId(userId)) {
    throw new ApiError(400, "UserId format is not correct");
  }
  const pageCount = parseInt(page, 10);
  const limitCount = parseInt(limit, 10);
  const skipCount = (pageCount - 1) * limitCount;
  const matchStage = userId
    ? { owner: new mongoose.Types.ObjectId(userId) }
    : {};

  if (query) {
    matchStage.$or = [
      { title: { $regex: query, $options: "i" } },
      { discription: { $regex: query, $options: "i" } },
    ];
  }
  const sortStage = {};
  if (sortBy && sortType) {
    sortStage[sortBy] = sortType === "asc" ? 1 : -1;
  } else {
    sortStage["createdAt"] = -1;
  }
  const video = await Video.aggregate([
    { $match: matchStage },
    { $sort: sortStage },
    { $skip: skipCount },
    { $limit: limitCount },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
        pipeline: [
          {
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "channel",
              as: "subs",
            },
          },
          {
            $addFields: {
              subsCount: {
                $size: "$subs",
              },
            },
          },
          {
            $project: {
              username: 1,
              fullName: 1,
              subsCount: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        owner: {
          $first: "$ownerDetails",
        },
      },
    },
    {
      $project: {
        thumbnail: 1,
        title: 1,
        duration: 1,
        views: 1,
        createdAt: 1,
        owner: 1,
      },
    },
  ]);
  if (!video) {
    throw new ApiError(500, "Issue while processing the videos");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, video, "The required videos are here"));
});

const publishVideo = asyncHandler(async (req, res) => {
  const { title, discription } = req.body;
  if (!title || title.trim() === "") {
    throw new ApiError(400, "Title is not provided");
  }
  if (!discription || discription.trim() === "") {
    throw new ApiError(400, "Discription is not provided");
  }
  const thumbnailLocalPath = req.files?.thumbnail[0]?.path;
  const videoFileLocalPath = req.files?.videoFile[0]?.path;
  if (!thumbnailLocalPath) {
    throw new ApiError(400, "Thumbnail is not provided");
  }
  if (!videoFileLocalPath) {
    throw new ApiError(400, "Video File is not Uploaded");
  }
  const thumbnail = await cloudinaryFileUploader(thumbnailLocalPath);
  const videoFile = await cloudinaryFileUploader(videoFileLocalPath);
  if (!thumbnail?.url) {
    throw new ApiError(400, "Thumbnail not Uploaded");
  }
  if (!videoFile?.url) {
    throw new ApiError(400, "Video not Uploaded");
  }
  const uploadedVideo = await Video.create({
    title,
    discription,
    thumbnail: thumbnail.url,
    videoFile: videoFile.url,
    duration: videoFile.duration,
    owner: req.user._id,
  });
  if (!uploadedVideo) {
    throw new ApiError(500, "Error while uploading a video");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(200, uploadedVideo, "Video is Uploaded Successfully")
    );
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Video ID is not provided");
  }
  const existingVideo = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
        pipeline: [
          {
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "channel",
              as: "subscribers",
            },
          },
          {
            $addFields: {
              subscriberCount: {
                $size: "$subscribers",
              },
            },
          },
          {
            $project: {
              fullName: 1,
              username: 1,
              avatar: 1,
              subscriberCount: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        likeCount: {
          $size: "$likes",
        },
        owner: {
          $first: "$ownerDetails",
        },
      },
    },
    {
      $project: {
        videoFile: 1,
        thumbnail: 1,
        title: 1,
        discription: 1,
        duration: 1,
        views: 1,
        createdAt: 1,
        likeCount: 1,
        owner: 1,
      },
    },
  ]);
  if (!existingVideo?.length) {
    throw new ApiError(400, "Video with Provided ID doesn't exist");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, existingVideo[0], "Video has Returned"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, discription } = req.body;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Wrong videoId format");
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video Not Found");
  }
  if (!title?.trim() || !discription?.trim()) {
    throw new ApiError(400, "Title and discription is required to update");
  }
  video.title = title;
  video.discription = discription;
  const thumbnailLocalPath = req.file?.path;
  if (!thumbnailLocalPath) {
    throw new ApiError(400, "Upload of Thumbnail is required");
  }
  const updatedThumbnail = await cloudinaryFileUploader(thumbnailLocalPath);
  if (!updatedThumbnail?.url) {
    throw new ApiError(500, "Error while uploading new Thumbnail");
  }
  if (video.thumbnail) {
    await deleteFromCloudinary(video.thumbnail);
  }
  video.thumbnail = updatedThumbnail.url;
  await video.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video Updated Successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(404, "Vedio Not Found");
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not Found");
  }
  if (video.thumbnail) {
    await deleteFromCloudinary(video.thumbnail);
  }
  if (video.videoFile) {
    await deleteFromCloudinary(video.videoFile, "video");
  }
  const deletedVideo = await Video.findByIdAndDelete(videoId);
  if (!deletedVideo) {
    throw new ApiError(500, "File is not deleted due to some internal issue");
  }
  return res
    .status(200)
    .json(new ApiResponse(201, deletedVideo, "Video deleted Successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(404, "Vedio ID format is wrong");
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(400, "Video doesn't exist");
  }
  video.isPublished = !video.isPublished;
  await video.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(
      new ApiResponse(200, video.isPublished, "Status Changed Successfully")
    );
});

export {
  getAllVideos,
  publishVideo,
  getVideoById,
  deleteVideo,
  togglePublishStatus,
  updateVideo,
};
