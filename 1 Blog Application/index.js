import express from "express";
import bodyParser from "body-parser";

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
const year = new Date().getFullYear();
var blogs = [];
var id = 1;

app.get("/", (req, res) => {
  var data;
  var recentPost = [];
  if (blogs.length === 0) {
    data = {
    blogsEjs: blogs,
    yearNum : year
    }

  } else if (blogs.length >= 4) {
    recentPost = structuredClone(blogs.slice(-4));

    for (let i = 0; i < recentPost.length; i++) {
      if (recentPost[i].title.length > 10) {
        recentPost[i].title = recentPost[i].title.slice(0,10) + "...";
      }
      if (recentPost[i].content.length > 20) {
        recentPost[i].content = recentPost[i].content.slice(0,20) + "...";
      }
    }

    data = {
      blogsEjs: blogs,
      homePageBlogTitle: blogs[blogs.length - 1].title,
      homePageBlogContent: blogs[blogs.length - 1].content,
      homePageBlogDate: blogs[blogs.length - 1].timestamp,
      recentPostEjs: recentPost,
      yearNum : year
    }

  } else {
    recentPost = structuredClone(blogs);

    for (let i = 0; i < recentPost.length; i++) {
      if (recentPost[i].title.length > 10) {
        recentPost[i].title = recentPost[i].title.slice(0,10) + "...";
      }
      if (recentPost[i].content.length > 20) {
        recentPost[i].content = recentPost[i].content.slice(0,20) + "...";
      }
    }

    data = {
      blogsEjs: blogs,
      homePageBlogTitle: blogs[blogs.length - 1].title,
      homePageBlogContent: blogs[blogs.length - 1].content,
      homePageBlogDate: blogs[blogs.length - 1].timestamp,
      recentPostEjs: recentPost,
      yearNum : year
    }

  }

  res.render("index.ejs", data);
});

app.get("/postBlog", (req, res) => {
  res.render("postBlog.ejs", {yearNum : year});
});

app.get("/manageBlog", (req, res) => {
  res.render("manageBlog.ejs", {yearNum : year});
});

app.post("/submit", (req, res) => { 
  res.render("submit.ejs");
  var blogPost = new BlogPost(req.body["blogTitle"], req.body["blogContent"], new Date().toLocaleDateString("en-GB"));
  blogs.push(blogPost);
});

// Get the edit page
app.get('/edit/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const post = blogs.find(p => p.blogId === id);

  if (!post) {
    return res.status(404).send("Post not found");
  }

  res.render('edit.ejs', { post, yearNum : year});
});

// To submit the changes
app.post('/edit/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const post = blogs.find(p => p.blogId === id);

  if (!post) {
    return res.status(404).send("Post not found");
  }

  post.title = req.body.blogTitle;
  post.content = req.body.blogContent;

  res.render("submit.ejs");
});

// Delete function
app.post('/post/:id/delete', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = blogs.findIndex(p => p.blogId === id);

  if (index === -1) {
    return res.status(404).send("Post not found");
  }

  blogs.splice(index, 1); // Delete the post according to id

  res.sendStatus(200); // 返回成功
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

function BlogPost(title, content, timestamp) {
  this.blogId = id;
  id++;
  this.title = title;
  this.content = content;
  this.timestamp = timestamp;
};


