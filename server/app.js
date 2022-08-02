const path = require("path");

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const multer = require("multer");
const cors = require("cors");

const { graphqlHTTP } = require("express-graphql");

const schema = require("./graphql/schema");
const graphqlResolver = require("./graphql/resolvers");
const isAuth = require("./middleware/is-auth");

const app = express();
const { clearImage } = require("./helpers/feed");

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    cb(null, new Date().toISOString() + "-" + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

// app.use(bodyParser.urlencoded()); // x-www-form-urlencoded <form>
app.use(cors());
app.use(bodyParser.json()); // application/json
app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single("image")
);
app.use("/images", express.static(path.join(__dirname, "images")));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "OPTIONS, GET, POST, PUT, PATCH, DELETE"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

app.use(isAuth);

app.put("/put-image", (req, res, next) => {
  try {
    console.log("body:", req.body);
    const { oldPath } = req.body;
    if (!req.isAuth) {
      const error = new Error("Authenticate failed!!!");
      error.statusCode = 401;
      throw error;
    }
    if (!req.file) {
      const error = new Error("No file provided!!!");
      error.statusCode = 422;
      throw error;
    }

    if (oldPath) {
      clearImage(oldPath);
    }

    return res.status(500).json({
      message: "File is stored!!!",
      filePath: req.file.path,
      isEditing: oldPath ? true : false,
    });
  } catch (err) {
    console.log(err);
    return next(err);
  }
});

app.use(
  "/graphql",
  graphqlHTTP({
    schema: schema,
    rootValue: graphqlResolver,
    graphiql: true, // for tools
    customFormatErrorFn: (error) => {
      return {
        message: error.message,
        status: error.originalError?.statusCode || 500,
        locations: error.locations,
        stack: error.stack ? error.stack.split("\n") : [],
        path: error.path,
      };
    },
  })
);

app.use((error, req, res, next) => {
  console.log(error);
  const status = error.statusCode || 500;
  const message = error.message;
  const data = error.data;
  res.status(status).json({ message: message, data: data, status });
});

mongoose
  .connect(
    "mongodb+srv://kietcao:hokgadau123@cluster0.ps9wx.mongodb.net/learn-graphql?retryWrites=true&w=majority",
    { useUnifiedTopology: true, useNewUrlParser: true }
  )
  .then(() => {
    app.listen(8080, () => {
      console.log("Server is running on 8080!!!!");
    });
  })
  .catch((err) => console.log(err));
