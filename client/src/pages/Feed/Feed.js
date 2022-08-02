import React, { Component, Fragment } from "react";

import Post from "../../components/Feed/Post/Post";
import Button from "../../components/Button/Button";
import FeedEdit from "../../components/Feed/FeedEdit/FeedEdit";
import Input from "../../components/Form/Input/Input";
import Paginator from "../../components/Paginator/Paginator";
import Loader from "../../components/Loader/Loader";
import ErrorHandler from "../../components/ErrorHandler/ErrorHandler";
import "./Feed.css";

class Feed extends Component {
  state = {
    isEditing: false,
    posts: [],
    totalPosts: 0,
    editPost: null,
    status: "",
    postPage: 1,
    postsLoading: true,
    editLoading: false
  };

  componentDidMount() {
    fetch("http://localhost:8080/graphql", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + this.props.token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query: `
          query {
            GetStatus{
              status
            }
          }
        `
      })
    })
      .then(res => res.json())
      .then(resData => {
        console.log(resData);
        const {
          data: {
            GetStatus: { status }
          }
        } = resData;
        this.setState({ status });
      })
      .catch(this.catchError);

    this.loadPosts();
  }

  loadPosts = direction => {
    if (direction) {
      this.setState({ postsLoading: true, posts: [] });
    }
    let page = this.state.postPage;
    if (direction === "next") {
      page++;
      this.setState({ postPage: page });
    }
    if (direction === "previous") {
      page--;
      this.setState({ postPage: page });
    }
    console.log(page);
    const graphqlQuery = {
      query: `
        query {
          GetPosts(page: ${page}){
            numOfPosts
            posts {
              _id
              createdAt
              updatedAt
              title
              imageUrl
              content
              creator {
                name
              }
            }
          }
        }
      `
    };
    fetch("http://localhost:8080/graphql", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + this.props.token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(graphqlQuery)
    })
      .then(res => res.json())
      .then(resData => {
        console.log(resData);
        const {
          data: {
            GetPosts: { numOfPosts, posts }
          }
        } = resData;
        this.setState({
          posts: posts.map(post => {
            return {
              ...post,
              imagePath: post.imageUrl
            };
          }),
          totalPosts: numOfPosts,
          postsLoading: false
        });
      })
      .catch(this.catchError);
  };

  statusUpdateHandler = event => {
    event.preventDefault();
    fetch("http://localhost:8080/graphql", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + this.props.token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query: `
          mutation {
            UpdateStatus(status: "${this.state.status}"){
              status
            }
          }
        `
      })
    })
      .then(res => res.json())
      .then(resData => {
        console.log(resData);
      })
      .catch(this.catchError);
  };

  newPostHandler = () => {
    this.setState({ isEditing: true });
  };

  startEditPostHandler = postId => {
    this.setState(prevState => {
      const loadedPost = { ...prevState.posts.find(p => p._id === postId) };

      return {
        isEditing: true,
        editPost: loadedPost
      };
    });
  };

  cancelEditHandler = () => {
    this.setState({ isEditing: false, editPost: null });
  };

  finishEditHandler = ({ title, content, image }) => {
    this.setState({
      editLoading: true
    });

    const formData = new FormData();
    formData.append("title", title);
    formData.append("content", content);
    formData.append("image", image);
    if (this.state.editPost) {
      console.log(this.state.editPost);
      formData.append("oldPath", this.state.editPost.imagePath);
    }

    fetch("http://localhost:8080/put-image", {
      method: "PUT",
      headers: {
        Authorization: "Bearer " + this.props.token
      },
      body: formData
    })
      .then(res => {
        return res.json();
      })
      .then(res => {
        console.log(res);
        const { isEditing, filePath } = res;
        const { status, message } = res;
        if (status === 422 || status === 401) {
          throw new Error(message);
        }
        const graphqlQuery = !isEditing
          ? {
              query: `
                mutation ($input: postInputData!) {
                  CreatePost(postInput: $input) {
                    _id
                    createdAt
                    updatedAt
                    title
                    imageUrl
                    content
                    creator {
                      name
                    }
                  }
                }
              `,
              variables: {
                input: {
                  title,
                  content,
                  imageUrl: res.filePath
                }
              }
            }
          : {
              query: `
                mutation ($input: updatedPostInputData!) {
                  UpdatePost(updatedInput: $input) {
                    _id
                    createdAt
                    updatedAt
                    title
                    imageUrl
                    content
                    creator {
                      name
                    }
                  }
                }
              `,
              variables: {
                input: {
                  postId: this.state.editPost._id,
                  title,
                  content,
                  imageUrl: filePath
                }
              }
            };
        console.log(graphqlQuery);
        return fetch("http://localhost:8080/graphql", {
          method: "POST",
          body: JSON.stringify(graphqlQuery),
          headers: {
            Authorization: "Bearer " + this.props.token,
            "Content-Type": "application/json"
          }
        });
      })

      .then(res => res.json())
      .then(resData => {
        if (this.state.editPost) {
          const {
            data: { UpdatePost: post }
          } = resData;
          const updatedPost = {
            _id: post._id,
            title: post.title,
            content: post.content,
            creator: post.creator,
            createdAt: post.createdAt,
            imagePath: post.imageUrl
          };
          this.setState(prevState => {
            const index = prevState.posts.findIndex(
              post => post._id === prevState.editPost._id
            );
            if (index !== -1) prevState.posts[index] = { ...updatedPost };
            return {
              posts: [...prevState.posts]
            };
          });
        } else {
          const {
            data: { CreatePost: post }
          } = resData;
          const newPost = {
            _id: post._id,
            title: post.title,
            content: post.content,
            creator: post.creator,
            createdAt: post.createdAt,
            imagePath: post.imageUrl
          };
          this.setState(prevState => {
            prevState.posts.length >= 3 && prevState.posts.pop();
            prevState.posts.unshift(newPost);
            return {
              posts: [...prevState.posts],
              postPage: 1
            };
          });
        }

        this.setState(prevState => {
          return {
            isEditing: false,
            editPost: null,
            editLoading: false
          };
        });
      })
      .catch(err => {
        console.log(err);
        this.setState({
          isEditing: false,
          editPost: null,
          editLoading: false,
          error: err
        });
      });
  };

  statusInputChangeHandler = (input, value) => {
    this.setState({ status: value });
  };

  deletePostHandler = postId => {
    this.setState({ postsLoading: true });
    fetch("http://localhost:8080/graphql", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + this.props.token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query: `
          mutation{
            DeletePost(postId: "${postId}")
          }
        `
      })
    })
      .then(res => res.json())
      .then(resData => {
        console.log(resData);
        if (resData.errors) {
          throw new Error("Delet post failed!!!");
        }
        this.loadPosts();
        this.setState(prevState => {
          const updatedPosts = prevState.posts.filter(p => p._id !== postId);
          return { posts: updatedPosts, postsLoading: false };
        });
      })
      .catch(err => {
        console.log(err);
        this.setState({ postsLoading: false });
      });
  };

  errorHandler = () => {
    this.setState({ error: null });
  };

  catchError = error => {
    this.setState({ error: error });
  };

  render() {
    return (
      <Fragment>
        <ErrorHandler error={this.state.error} onHandle={this.errorHandler} />
        <FeedEdit
          editing={this.state.isEditing}
          selectedPost={this.state.editPost}
          loading={this.state.editLoading}
          onCancelEdit={this.cancelEditHandler}
          onFinishEdit={this.finishEditHandler}
        />
        <section className="feed__status">
          <form onSubmit={this.statusUpdateHandler}>
            <Input
              type="text"
              placeholder="Your status"
              control="input"
              onChange={this.statusInputChangeHandler}
              value={this.state.status}
            />
            <Button mode="flat" type="submit">
              Update
            </Button>
          </form>
        </section>
        <section className="feed__control">
          <Button mode="raised" design="accent" onClick={this.newPostHandler}>
            New Post
          </Button>
        </section>
        <section className="feed">
          {this.state.postsLoading && (
            <div style={{ textAlign: "center", marginTop: "2rem" }}>
              <Loader />
            </div>
          )}
          {this.state.posts.length <= 0 && !this.state.postsLoading ? (
            <p style={{ textAlign: "center" }}>No posts found.</p>
          ) : null}
          {!this.state.postsLoading && (
            <Paginator
              onPrevious={this.loadPosts.bind(this, "previous")}
              onNext={this.loadPosts.bind(this, "next")}
              lastPage={Math.ceil(this.state.totalPosts / 2)}
              currentPage={this.state.postPage}
            >
              {this.state.posts.map(post => (
                <Post
                  key={post._id}
                  id={post._id}
                  author={post.creator.name}
                  date={new Date(post.createdAt).toLocaleDateString("en-US")}
                  title={post.title}
                  image={post.imageUrl}
                  content={post.content}
                  onStartEdit={this.startEditPostHandler.bind(this, post._id)}
                  onDelete={this.deletePostHandler.bind(this, post._id)}
                />
              ))}
            </Paginator>
          )}
        </section>
      </Fragment>
    );
  }
}

export default Feed;
