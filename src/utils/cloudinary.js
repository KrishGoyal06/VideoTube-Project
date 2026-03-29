import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const cloudinaryFileUploader = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    console.log("File has been uploaded with URL: ", response.url);
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); //delete the file which have issue while uploading on the cloudinary
    return null;
  }
};
const deleteFromCloudinary = async (cloudinaryURL, resourceType = "image") => {
  try {
    if (!cloudinaryURL) return null;
    const publicId = cloudinaryURL.split("/").pop().split(".")[0];
    const response = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    console.log(
      `Cloudinary ${resourceType} File is deleted: ${response.result}`
    );
    return response;
  } catch (err) {
    console.log(`While deleting we have an error: ${err}`);
    throw err;
  }
};

export { cloudinaryFileUploader, deleteFromCloudinary };
