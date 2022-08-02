const { buildSchema } = require("graphql");

// ! at the end means non-nullable
const schema = buildSchema(`

  type Post{
    _id: String!
    title: String!
    imageUrl: String!
    content: String!
    creator: User!
    createdAt: String!
    updatedAt: String!
  }

  type User{
    _id: String!
    email: String!
    name: String!
    password: String
    status: String!
    posts: [Post!]!
  }

  input userInputData{
    email: String!
    name: String!
    password: String!
  }

  input postInputData{
    title: String!
    content: String!
    imageUrl: String!
  }
  
  input updatedPostInputData{
    title: String!
    content: String!
    imageUrl: String!
    postId: String!
  }

  type authData{
    token: String!
    userId: String!
  }

  type postData{
    numOfPosts: Int!
    posts: [Post!]!
  }

  type RootQuery {
    GetPosts(page: Int!): postData!
    GetPost(postId: String!): Post!
    GetStatus: User!
  }

  type RootMutation{
    CreateUser(userInput: userInputData!): User!
    Login(email: String!, password: String!): authData!
    CreatePost(postInput: postInputData!): Post!
    UpdatePost(updatedInput: updatedPostInputData!): Post!
    DeletePost(postId: String!): Boolean
    UpdateStatus(status: String!): User!
  }

  schema {
    query: RootQuery
    mutation: RootMutation
  }

`);

module.exports = schema;
