// server.js
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.k8qhd2d.mongodb.net/?appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Global collections
let userCollection;
let cartCollection;
let reviewCollection;
let menuCollection;

// Connect to MongoDB
async function run() {
  try {
    await client.connect();
    const db = client.db("vegiterianDB");

    userCollection = db.collection("users");
    cartCollection = db.collection("carts");
    reviewCollection = db.collection("reviews");
    menuCollection = db.collection("menu");

    await client.db("admin").command({ ping: 1 });
    console.log("MongoDB connected successfully!");
  } catch (err) {
    console.error("MongoDB connection error:", err);
  }
}
run().catch(console.dir);

// ------------------------
// JWT Verification Middleware
// ------------------------
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).send({ message: "Forbidden access" });

  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.SECRET_TOKEN, (err, decoded) => {
    if (err) return res.status(401).send({ message: "Forbidden access" });
    req.decoded = decoded;
    next();
  });
};

// Admin verification middleware
const verifyAdmin = async (req, res, next) => {
  const email = req.decoded.email;
  const user = await userCollection.findOne({ email });
  if (!user || user.role !== "admin") {
    return res.status(403).send({ message: "Forbidden access" });
  }
  next();
};

// ------------------------
// JWT Route
// ------------------------
app.post("/jwt", (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.SECRET_TOKEN, { expiresIn: "1h" });
  res.send({ token });
});

// ------------------------
// User Routes
// ------------------------
app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
  const users = await userCollection.find().toArray();
  res.send(users);
});

app.post("/users", async (req, res) => {
  const user = req.body;
  const existingUser = await userCollection.findOne({ email: user.email });
  if (existingUser)
    return res.send({ message: "User already exists", insertedId: null });

  const result = await userCollection.insertOne(user);
  res.send(result);
});

app.patch("/users/admin/:id", verifyToken, verifyAdmin, async (req, res) => {
  const id = req.params.id;
  const result = await userCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { role: "admin" } }
  );
  res.send(result);
});

app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
  const id = req.params.id;
  const result = await userCollection.deleteOne({ _id: new ObjectId(id) });
  res.send(result);
});

app.get("/user/admin/:email", verifyToken, async (req, res) => {
  const email = req.params.email;
  if (email !== req.decoded.email)
    return res.status(403).send({ message: "Unauthorized access" });

  const user = await userCollection.findOne({ email });
  res.send({ admin: user?.role === "admin" });
});

// ------------------------
// Menu Routes
// ------------------------
app.get("/menu", async (req, res) => {
  const result = await menuCollection.find().toArray();
  res.send(result);
});

// ------------------------
// Reviews Routes
// ------------------------
app.get("/reviews", async (req, res) => {
  const result = await reviewCollection.find().toArray();
  res.send(result);
});

// ------------------------
// Cart Routes
// ------------------------
app.get("/carts", async (req, res) => {
  const email = req.query.email;
  const result = await cartCollection.find({ email }).toArray();
  res.send(result);
});

app.post("/carts", async (req, res) => {
  const cartItem = req.body;
  const result = await cartCollection.insertOne(cartItem);
  res.send(result);
});

app.delete("/carts/:id", verifyToken, async (req, res) => {
  const id = req.params.id;
  const result = await cartCollection.deleteOne({ _id: new ObjectId(id) });
  res.send(result);
});

// ------------------------
// Root route
// ------------------------
app.get("/", (req, res) => {
  res.send("Vegeterian Server is Running!");
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
