const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;
require("dotenv").config();
const jwt = require("jsonwebtoken");

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.08yflhj.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const verifyJwt = (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log(authHeader);
  if (!authHeader) {
    return res.status(401).send({ message: "unauthorized access" });
  }

  const token = authHeader.split(" ")[1];
  console.log(token);

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    console.log(decoded);
    req.decoded = decoded;
    next();
  });
};

async function run() {
  try {
    app.post("/jwt", (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: "5h" });
      res.json(token);
    });

    const serviceCollection = client
      .db("service-review")
      .collection("services");

    const reviewCollection = client.db("service-review").collection("reviews");

    app.get("/services", async (req, res) => {
      const query = {};
      const cursor = serviceCollection.find(query).limit(3);
      const services = await cursor.toArray();
      res.send(services);
    });

    app.get("/services/all", async (req, res) => {
      const query = {};
      const cursor = serviceCollection.find(query);
      const services = await cursor.toArray();
      res.send(services);
    });

    app.get("/services/all/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await serviceCollection.findOne(query);
      res.send(result);
    });

    app.get("/reviews", async (req, res) => {
      const query = {};
      const cursor = reviewCollection.find(query).sort({ time: -1 });
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/reviews/my-review", verifyJwt, async (req, res) => {
      const decoded = req.decoded;
      if (decoded.email !== req.query.email) {
        return res.status(403).send({ message: "Forbidden access" });
      }
      const email = req.query.email;
      console.log(email);
      const filter = { email: email };
      const cursor = reviewCollection.find(filter);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/reviews/my-review/:id", async (req, res) => {
      const id = req.params.id;
      let query = { _id: ObjectId(id) };
      const result = await reviewCollection.findOne(query);
      res.send(result);
    });

    app.post("/services/all", async (req, res) => {
      const newService = req.body;
      const result = await serviceCollection.insertOne(newService);
      res.send(result);
    });

    app.post("/reviews", async (req, res) => {
      const review = req.body;
      const result = await reviewCollection.insertOne(review);
      res.send(result);
    });

    app.put("/reviews/my-review/:id", async (req, res) => {
      const id = req.params.id;
      const getReview = req.body;
      const review = getReview.newReview;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateReview = {
        $set: {
          review: review,
        },
      };
      const result = await reviewCollection.updateOne(
        filter,
        updateReview,
        options
      );
      res.send(result);
    });

    app.delete("/reviews/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await reviewCollection.deleteOne(query);
      res.send(result);
    });
  } finally {
  }
}
run().catch((err) => console.error(err));

app.get("/", (req, res) => {
  res.send("Service review server is running!!!");
});

app.listen(port, () => {
  console.log(`Service review app listening on port ${port}`);
});
