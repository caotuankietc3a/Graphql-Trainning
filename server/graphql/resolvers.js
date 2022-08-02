const User = require("../models/user");
// const { validationResult } = require("express-validator/check");
const Post = require("../models/post");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { clearImage } = require("../helpers/feed");

const CreateUser = async (args, req) => {
  const {
    userInput: { email, password, name },
  } = args;
  const exitedUser = await User.findOne({ email: email });
  if (exitedUser) {
    console.log("exitedUser:", exitedUser);
    const error = new Error(
      "Validation failed. Make sure the email address isn't used yet!"
    );
    error.statusCode = 422;
    throw error;
  }

  const hashedPw = await bcrypt.hash(password, 12);
  const user = await new User({
    email,
    password: hashedPw,
    name,
  }).save();
  return { ...user._doc, _id: user._id.toString() };
};

const Login = async ({ email, password }, req) => {
  const user = await User.findOne({ email });
  if (!user) {
    const error = new Error("User didn't exist! Please try another one!!!");
    error.statusCode = 401; // Authentication failed
    throw error;
  }

  const isMatchedPassword = await bcrypt.compare(password, user.password);
  if (!isMatchedPassword) {
    const error = new Error("Password is invalid! Please try another one!!!");
    error.statusCode = 401; // Authentication failed
    throw error;
  }

  const token = jwt.sign(
    { userId: user._id.toString(), email },
    "somesupersecretsecret",
    { expiresIn: "10h" }
  );
  return { token, userId: user._id.toString() };
};

const CreatePost = async ({ postInput }, req) => {
  const { title, content, imageUrl } = postInput;
  if (!req.isAuth) {
    const error = new Error("Authenticate failed!!!");
    error.statusCode = 401;
    throw error;
  }
  const user = await User.findOne({ _id: req.userId });
  const newPost = await new Post({
    title,
    content,
    imageUrl,
    creator: user,
  }).save();
  user.posts.push(newPost);
  await user.save();
  return {
    ...newPost._doc,
    _id: newPost._id.toString(),
    createdAt: newPost.createdAt.toISOString(),
    updatedAt: newPost.updatedAt.toISOString(),
  };
};

const GetPosts = async ({ page }, req) => {
  if (!req.isAuth) {
    const error = new Error("Authenticate failed!!!");
    error.statusCode = 401;
    throw error;
  }
  const totalPosts = await Post.countDocuments();
  const posts = await Post.find()
    .populate({ path: "creator" })
    .sort({ createdAt: -1 })
    .skip(3 * (page - 1))
    .limit(3);
  return {
    posts: posts.map((post) => {
      return {
        ...post._doc,
        _id: post._id.toString(),
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
      };
    }),
    numOfPosts: totalPosts,
  };
};

const GetPost = async ({ postId }, req) => {
  if (!req.isAuth) {
    const error = new Error("Authenticate failed!!!");
    error.statusCode = 401;
    throw error;
  }
  const post = await Post.findById(postId).populate("creator");

  return {
    ...post._doc,
    _id: post._id.toString(),
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  };
};

const UpdatePost = async (
  { updatedInput: { postId, title, imageUrl, content } },
  req
) => {
  if (!req.isAuth) {
    const error = new Error("Authenticate failed!!!");
    error.statusCode = 401;
    throw error;
  }
  const post = await Post.findById(postId);
  if (!post) {
    const error = new Error("Post is not found!!!");
    error.statusCode = 403;
    throw error;
  }
  if (post.creator.toString() !== req.userId) {
    const error = new Error("Not Authorized!!!");
    error.statusCode = 404;
    throw error;
  }
  const updatedPost = await Post.findByIdAndUpdate(
    postId,
    {
      title,
      imageUrl,
      content,
    },
    { new: true }
  ).populate("creator");
  return {
    ...updatedPost._doc,
    _id: updatedPost._id.toString(),
    createdAt: updatedPost.createdAt.toISOString(),
    updatedAt: updatedPost.updatedAt.toISOString(),
  };
};

const DeletePost = async ({ postId }, req) => {
  if (!req.isAuth) {
    const error = new Error("Authenticate failed!!!");
    error.statusCode = 401;
    throw error;
  }
  const post = await Post.findById(postId);
  if (!post) {
    const error = new Error("Post is not found!!!");
    error.statusCode = 403;
    throw error;
  }

  if (post.creator.toString() !== req.userId) {
    const error = new Error("Not Authorized!!!");
    error.statusCode = 404;
    throw error;
  }

  const removedPost = await Post.findByIdAndDelete(postId);
  clearImage(removedPost.imageUrl);
  const user = await User.findByIdAndUpdate(
    req.userId,
    {
      $pull: {
        posts: postId,
      },
    },
    { new: true }
  );
  console.log("user:", user);
  return true;
};

const GetStatus = async (_, req) => {
  if (!req.isAuth) {
    const error = new Error("Authenticate failed!!!");
    error.statusCode = 401;
    throw error;
  }
  const user = await User.findById(req.userId);
  if (!user) {
    const error = new Error("No user found!!!");
    error.statusCode = 404;
    throw error;
  }
  return { ...user._doc, _id: user._id.toString() };
};

const UpdateStatus = async ({ status }, req) => {
  if (!req.isAuth) {
    const error = new Error("Authenticate failed!!!");
    error.statusCode = 401;
    throw error;
  }
  const user = await User.findById(req.userId);
  if (!user) {
    const error = new Error("No user found!!!");
    error.statusCode = 404;
    throw error;
  }
  user.status = status;
  await user.save();
  return { ...user._doc, _id: user._id.toString() };
};

module.exports = {
  CreateUser,
  Login,
  CreatePost,
  GetPosts,
  GetPost,
  UpdatePost,
  DeletePost,
  GetStatus,
  UpdateStatus,
};
