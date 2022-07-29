const User = require("../models/user");
// const { validationResult } = require("express-validator/check");
const Post = require("../models/post");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

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
  console.log(user._id === user._id.toString());
  const newPost = await new Post({
    title,
    content,
    imageUrl,
    creator: user,
  }).save();
  console.log("newPost:", newPost);
  user.posts.push(newPost);
  await user.save();
  return {
    ...newPost._doc,
    _id: newPost._id.toString(),
    createAt: newPost.createdAt.toISOString(),
    updatedAt: newPost.updatedAt.toISOString(),
  };
};

const GetPosts = async (_, req) => {
  if (!req.isAuth) {
    const error = new Error("Authenticate failed!!!");
    error.statusCode = 401;
    throw error;
  }
  const totalPosts = await Post.countDocuments();
  const posts = await Post.find()
    .populate({ path: "creator" })
    .sort({ createdAt: -1 }); // decs
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

module.exports = { CreateUser, Login, CreatePost, GetPosts };
