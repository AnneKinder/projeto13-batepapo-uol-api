import express from "express";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import cors from "cors";
import joi from "joi";

//JOI
const partiSchema = joi.object({
  name: joi.string().required(),
});

//CONFIGS
const app = express();
dotenv.config();
app.use(express.json());
app.use(cors());

//MONGODB
const mongoClient = new MongoClient(process.env.MONGO_URI);

try {
  await mongoClient.connect();
  console.log("MongoClient connected!");
} catch (err) {
  console.log(err);
}

//GLOBALS
const db = mongoClient.db("uol");
const partiCollection = db.collection("participants");

//ROUTES

app.post("/participants", async (req, res) => {
  const { name } = req.body;
  const validation = partiSchema.validate(req.body, { abortEarly: false });

  if (validation.error) {
    const errors = validation.error.details.map((detail) => detail.message);
    res.status(422).send(errors);
    return;
  }

  try {
    const isLogged = await partiCollection.findOne({ name: name });
    if (isLogged) {
      res.sendStatus(409);
      return;
    }
    await partiCollection.insertOne(req.body);
    res.sendStatus(201);
  } catch (err) {
    console.log(err);
  }
});

app.get("/participants", async (req, res) => {
  const participants = await partiCollection.find().toArray();
  res.send(participants);
});

app.listen(process.env.PORT, () =>
  console.log(`Server running in port ${process.env.PORT}`)
);
