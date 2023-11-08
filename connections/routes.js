const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = express();
const { connection, connectionBlogs } = require("./database");
const { Model, UserModel, EmailModel } = require("./schema");
const { sendEmail } = require("../emailVerification/emailControllers");
const { ObjectId } = require("mongodb");
const { sendBlogsMail } = require("../emailVerification/emailHtml");
// const otpCode = require("../emailVerification/emailControllers");
// console.log(otpCode, "from routes");
// const { client } = require("./connect");

app.post("/sendEmail", sendEmail);
app.post("/usermail", sendBlogsMail);

//middleware
const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(202);
    response.send("Authorization failed");
  } else {
    jwt.verify(jwtToken, "ABPPBH_ST", (error, payload) => {
      if (error) {
        response.status(202);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

// Login API

app.post("/api/login", async (request, response) => {
  const { email, otp } = request.body;
  connection.findOne({ email: email }).then(async (resObj) => {
    const otpMatched = await bcrypt.compare(otp, resObj.otp);
    if (otpMatched === true) {
      const payload = {
        email: email,
      };
      const jwt_token = jwt.sign(payload, "ABPPBH_ST");
      response.status(200).json({ jwt_token, email });
    } else {
      response.status(202);
      response.json({ message: "Invalid Otp" });
    }
  });
});

app.put("/users", async (request, response) => {
  const { updatePassword, email } = request.body;

  const hashedPassword = await bcrypt.hash(updatePassword, 10);
  connection
    .updateOne(
      {
        email: email,
      },
      { $set: { password: hashedPassword } }
    )
    .then((res) => {
      response.send(res);
    })
    .catch((err) => response.send(err));
});

app.get("/blogs", async (request, response) => {
  const blogsArray = await Model.find({});
  try {
    response.send(blogsArray);
  } catch (error) {
    response.send(error);
  }
});

app.post("/blogs", authenticateToken, async (request, response) => {
  const {
    title,
    description,
    category,
    blogImage,
    username,
    userrole,
    date,
    likes,
    comments,
    htmlFile,
  } = request.body;

  connectionBlogs
    .insertOne({
      title: title,
      description: description,
      category: category,
      blogImage: blogImage,
      username: username,
      userrole: userrole,
      date: date,
      likes: likes,
      comments,
      html: htmlFile,
    })
    .then((res) => {
      response.status(200);
      response.json({ message: res.insertedId });
    })
    .catch((err) => {
      response.send(err);
    });
});

//category Api

app.get("/blogs/filter", async (request, response) => {
  const { category } = request.query;
  if (category === "All") {
    var query = Model.find({});
  } else {
    var query = Model.find({ category: category });
  }
  const blogsByCategory = await query;
  try {
    response.send(blogsByCategory);
  } catch (error) {
    response.send(error);
  }
});

//blog view comp
app.get("/blogs/:id", (request, response) => {
  const { id } = request.params;
  connectionBlogs
    .findOne({ _id: new ObjectId(id) })
    .then((res) => response.send(res))
    .catch((err) => console.log(err));
});

app.post("/comments", authenticateToken, (request, response) => {
  const { comment, id, name, dateObject } = request.body;
  connectionBlogs
    .findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $push: { comments: { comment, name, dateObject } } },
      { $upsert: true },
      { new: true }
    )
    .then((res) => {
      console.log(res);
      response.status(200).json({ message: "new comment added" });
    })
    .catch((err) => response.send(err));
});

app.post("/profile", (request, response) => {
  const { designation, gender, name, email, isProfileUpdated } = request.body;
  connection
    .updateOne(
      { email: email },
      {
        $set: {
          name: name,
          designation: designation,
          gender: gender,
          isProfileUpdated: isProfileUpdated,
        },
      }
    )
    .then((res) => {
      response
        .status(200)
        .json({ message: "Profile Updated", name, designation });
    })
    .catch((err) => response.send(err));
});

app.post("/profile/check", authenticateToken, (request, response) => {
  const { email } = request.body;
  connection.findOne({ email: email }).then((res) => {
    if (res.isProfileUpdated === true) {
      response.status(200).json({ message: "Profile Already Updated" });
    } else {
      response.status(202).json({ message: "Not Updated Yet" });
    }
  });
});

app.put("/likes", async (request, response) => {
  const { id } = request.body;
  console.log(id);
  connectionBlogs
    .findOneAndUpdate({ _id: new ObjectId(id) }, { $inc: { likes: 1 } })
    .then((res) => {
      response.send(res);
    })
    .catch((err) => response.send(err));
});

module.exports = app;
