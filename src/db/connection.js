import mongoose, { mongo } from "mongoose";
import {DB_NAME} from "../constants.js";

const connectDB = async () => {
    try {
        const connectionInstane = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`\nMongoDB Connected !! DB HOST: ${connectionInstane.connection.host}`);
    } catch (error) {
        console.log("MongoDB Connection Error", error);
        process.exit(1)
    }
}

export default connectDB