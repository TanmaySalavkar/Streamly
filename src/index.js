import 'dotenv/config'
import dotenv from "dotenv"
dotenv.config({
    path: './env'
})
import connectDB from "./db/connection.js";


connectDB();