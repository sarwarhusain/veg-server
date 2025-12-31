const express = require("express");
const cors = require("cors");
const app = express();
const jwt = require("jsonwebtoken");
require("dotenv").config();
const port = process.env.PORT || 5001;
// node=> require('crypto').randomBytes(00).toString('hex')

//middleware
app.use(cors());
app.use(express.json());
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.k8qhd2d.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const userCollection = client.db("vegiterianDB").collection("users"); //4th step
    const cartCollection = client.db("vegiterianDB").collection("carts"); //3rd step
    const reviewCollection = client.db("vegiterianDB").collection("reviews"); //2nd step
    const menuCollection = client.db("vegiterianDB").collection("menu"); //1st step

    // //jwt token
    app.post("/jwt", async (req, res) => {
      const user = req.body; //payload hocce user
      const token = jwt.sign(user, process.env.SECRET_TOKEN, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    //varifyed Middleware
    const verifyToken = (req, res, next) => {
      console.log("inside verify token", req.headers.authorization);
      if (!req.headers.authorization) {
        //chek is has aprovel
        return res.status(401).send({ message: "forbiden access" });
      }
      const toekn = req.headers.authorization.split(" ")[1];
      //token er name er gap ke ' ' [1] bujay,,authorization: `Bearer ${localStorage.getItem("access-token")}`, BearerToken ,Bearer Token
      jwt.verify(toekn, process.env.SECRET_TOKEN, (err, decoded) => {
        if (err) {
          {
            return res.status(401).send({ message: "forbiden access" });
          }
        }
        req.decoded = decoded;
        next();
      });
    };

    //use verify admin after vefify token
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    //user making admin
    app.get("/user/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "UnAthorized access" });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    //delete user by admin(delete one by params:id)
    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    //delete  by patch(kuno ekta particular field update korar jonno use hoy )
    app.patch(
      "/users/admin/:id",
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            role: "admin",
          },
        };
        const result = await userCollection.updateOne(filter, updatedDoc);
        res.send(result);
      }
    );

    //user relatd api
    app.get("/users",  async (req, res) => {
      const resutl = await userCollection.find().toArray();
      res.send(resutl);
    });

    //users....
    app.post("/users", async (req, res) => {
      const user = req.body;
      //insert email if user desont exist:
      //you can do this many ways(1.email unique, 2.upsert, 3.check before insert)
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user Already exists", insertedId: null });
      } //
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    //delete cart item
    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
      //:id means:
      //“Capture whatever comes after /carts/ and store it in req.params.id”
    });

    //cart item show in navbar,custom hook
    app.get("/carts", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });

    //cart post....database a carts name diye ekta data create kora.
    app.post("/carts", async (req, res) => {
      const cartItem = req.body;
      const result = await cartCollection.insertOne(cartItem);
      res.send(result);
    });

    //reviews....
    app.get("/reviews", async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    });

    //users from menu  //menu Related APIs
    app.get("/menu", async (req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.json("Vegeterian is Sitting");
});

app.listen(port, () => {
  console.log(`server is running ${port}`);
});
/**
 * naming convention
 * app.get('/users')
 * app.get('/users/:id')
 * app.post('/users')
 * app.put('/users/:id')
 * app.patch('/users/:id')
 *
 */
//here is the pass and user name:
