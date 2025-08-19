import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import {User} from "../models/user.model.js"
import { uploadCloudinary } from "../utils/cloudinary.js"
import { httpNode } from "node-red"

const generateAccessRefreshToken = async(userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return {accessToken, refreshToken}
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }
}

const registerUser = asyncHandler( async (req,res) => {
    
    //get user details
    const {username,email,fullname,password} = req.body
    
    //validation
    if (
        [fullname,email,username,password].some((field)=>
            field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }
    
    //check if user already exits: username,email
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })
    
    if (existedUser){
        throw new ApiError(409, "User already exists")
    }
    
    //check for images, check for avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
    // let coverImageLocalPath;
    // if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    //     coverImageLocalPath = req.files.coverImage[0].path
    // }
    // if (!avatarLocalPath) {
    //     throw new ApiError(400, "Avatar file is required")
    // }
    
    //upload them to cloudinary, avatar
    const avatar = await uploadCloudinary(avatarLocalPath)
    const coverImage = await uploadCloudinary(coverImageLocalPath)
    
    if(!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }
    
    //create user object - create entry in db
    const user = await User.create({
        fullname,
        username: username.toLowerCase(),
        password,
        email,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",        
    })
    
    //remove password and refresh token field from response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    
    // check for user creation
    if (!createdUser){
        throw new ApiError(500, "Something went wrong while registering a user")
    }
    
    //return response
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Registered Successfully")
    )
    
})

const loginUser = asyncHandler(async(req, res)=> {
    //req body data
    const {email, username, password} = req.body

    if (!username || !email){
        throw new ApiError(400, "Username or Email is required")
    }
    //username or email login
    //find the user
    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if(!user) {
        throw new ApiError(404, "User doesn't exist")
    }
    //password check
    const passwordValid = await user.isPasswordCorrect(password)
        if(!passwordValid) {
        throw new ApiError(401, "Invalid Password")
    }
    //access token and refresh token
    const {accessToken, refreshToken} = await generateAccessRefreshToken(user._id)
    const loggedInUser = await User.findById(user._id).
    select("-password -refreshToken")
    
    //send cookie
    const options = {
        httpOnly: true,
        secure: true
    }
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(200, {
            user: loggedInUser, accessToken, refreshToken
        }, 
        "User Logged In Successfully"
    )
    )
    //redirect to home page
})

const logoutUser = asyncHandler (async(req, res)=>{
    await User.findByIdAndUpdate(
        req.user._id, 
        {
            $set: {refreshToken: undefined}
        },
        {
            new: true
        }
    )

        const options = {
        httpOnly: true,
        secure: true
    }
    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out"))
})

export {
    registerUser, loginUser, logoutUser
}