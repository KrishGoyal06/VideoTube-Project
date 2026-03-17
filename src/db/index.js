import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";
async function connectDB() {
  //db is in different continent so can take time use async await
  try {
    //during connection there may be errors so add try catch to protect the crash
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`
    );
    console.log(
      `MongoDB connected!! DB HOST :${connectionInstance.connection.host}`
    );
  } catch (err) {
    console.log("Erros in Database Connection: ", err);
    process.exit(1);
  }
}

export default connectDB;
