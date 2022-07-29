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

  type authData{
    token: String!
    userId: String!
  }

  type postData{
    numOfPosts: Int!
    posts: [Post!]!
  }

  type RootQuery {
    GetPosts: postData!
  }

  type RootMutation{
    CreateUser(userInput: userInputData!): User!
    Login(email: String!, password: String!): authData!
    CreatePost(postInput: postInputData!): Post!
  }

  schema {
    query: RootQuery
    mutation: RootMutation
  }
`);

module.exports = schema;
