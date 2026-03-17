import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { cloudinaryFileUploader } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessTokenAndRefreshToken = async (userId) => {
  const user = await User.findById(userId);
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;
  user.save({ validateBeforeSave: false });
  return { accessToken, refreshToken };
};

const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  const { username, email, fullName, password } = req.body;
  // validation - not empty
  if (fullName === "" || email === "" || username === "" || password === "") {
    console.log("Fields are empty");
    throw new ApiError(400, "All fields should be filled");
  }
  // check if user already exists: username, email
  const existUser = User.findOne({
    $or: [{ email }, { username }],
  });

  if (!existUser) {
    throw new ApiError(409, "User with same email or username already exist");
  }
  // check for images, check for avatar
  const avatarLocalPath = req.files?.avatar[0].path;
  // const coverImageLocalPath = req.files?.coverImage[0].path;
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage.path;
  }
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar image is required");
  }
  // upload them to cloudinary, avatar
  const avatar = await cloudinaryFileUploader(avatarLocalPath);
  const coverImage = await cloudinaryFileUploader(coverImageLocalPath);
  if (!avatar) {
    throw new ApiError(400, "Avatar not Uploaded");
  }
  // create user object - create entry in db
  const user = await User.create({
    fullName,
    email,
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    username: username.toLowerCase(),
  });
  // remove password and refresh token field from response
  const userId = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  // check for user creation
  if (!userId) {
    throw new ApiError(500, "Something went wrong while regestring user");
  }
  // return res
  return res
    .status(200)
    .json(
      new ApiResponse(201, userId, "User has been registered Successfully")
    );
});

const loginUser = asyncHandler(async (req, res) => {
  // get username and password
  const { username, email, password } = req.body;
  console.log(email);

  // check if the user exist
  if (!username || !email) {
    throw new ApiError(400, "Username or email is Required");
  }

  const user = await User.findOne({ $or: [{ username }, { email }] });

  if (!user) {
    throw new ApiError(404, "User don't exist");
  }
  // if user exist is the password correct
  if (!password) {
    throw new ApiError(403, "Enter the password");
  }

  const isPasswordValid = user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid login credantials");
  }
  // generate the access and refresh token
  const { accessToken, refreshToken } =
    await generateAccessTokenAndRefreshToken(user._id);
  // send cookies
  const option = {
    secure: true,
    httponly: true,
  };

  const loggedInUser = await User.findById(user._id).select(
    // this is because user is a ref and it has the ref of db before the addition of refreshToken
    "-password -refreshToken"
  );
  console.log("Login SuccessFull");

  // give res
  return res
    .status(200)
    .cookie("accessToken", accessToken, option)
    .cookie("refreshToken", refreshToken, option)
    .json(
      new ApiResponse(
        201,
        {
          user: loggedInUser,
          refreshToken,
          accessToken,
        },
        "User LoggedIn Successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  User.findByIdAndUpdate(
    req.user._id,
    { $set: { refreshToken: undefined } },
    { new: true }
  );
  const options = {
    httponly: true,
    secure: true,
  };
  console.log("Logout Successfull");

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(400, "unauthorized request");
  }

  const decodedToken = jwt.verify(
    incomingRefreshToken,
    process.env.REFRESH_TOKEN_SECRET
  );

  const user = await User.findById(decodedToken?._id);
  if (!user) {
    throw new ApiError(400, "invalid Refresh Token");
  }
  if (incomingRefreshToken !== user?.refreshToken) {
    throw new ApiError(400, "Refresh Token is expired or used");
  }

  const { accessToken, newRefreshToken } =
    await generateAccessTokenAndRefreshToken(user._id);
  const options = {
    httponly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken)
    .cookie("refreshToken", newRefreshToken)
    .json(
      new ApiResponse(
        200,
        {
          accessToken,
          refreshToken: newRefreshToken,
          options,
        },
        "New Access Token generated Successfully"
      )
    );
});

const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user?._id);
  const passwordStatus = await user.isPasswordCorrect(oldPassword);
  if (!passwordStatus) {
    throw (new ApiError(400), "Wrong Password");
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password Changed Successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User Fetched Successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;
  if (!(fullName || email)) {
    throw new ApiError(400, "Invalid Credentials are Passed");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new (200, user, "Credantials updated Successfully")());
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar Not Found");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading Updated Avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password -refreshToken");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar Updated Successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover Image Not Found");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading Updated Cover Image");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password -refreshToken");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover Image Updated Successfully"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changePassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
};
