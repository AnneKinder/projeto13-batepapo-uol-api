import express from "express";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import cors from "cors";
import joi from "joi";

//JOI
const partiSchema = joi.object({
  name: joi.string().required(),
});

const messageSchema = joi.object({
  text: joi.string().required(),
  to: joi.string().required(),
  type: joi.string().valid('private_message','message')
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
const partiColl = db.collection("participants");
const messageColl = db.collection("messages");

//ROUTES

//participants
app.post("/participants", async (req, res) => {
  const { name } = req.body;

  const newUser = {
    name: name,
    lastStatus: Date.now(),
  };

  const validation = partiSchema.validate(req.body, { abortEarly: false });

  if (validation.error) {
    const errors = validation.error.details.map((detail) => detail.message);
    res.status(422).send(errors);
    return;
  }

  try {
    const isLogged = await partiColl.findOne({ name: name });
    if (isLogged) {
      res.sendStatus(409);
      return;
    }
    await partiColl.insertOne(newUser);
    res.sendStatus(201);
  } catch (err) {
    console.log(err);
  }
});

app.get("/participants", async (req, res) => {
  const participants = await partiColl.find().toArray();
  res.send(participants);
});

//messages

app.post("/messages", async (req, res) => {
  const { to, text, type } = req.body;

  const validation = messageSchema.validate(req.body, { abortEarly: false });

  if (validation.error) {
    const errors = validation.error.details.map((detail) => detail.message);
    res.status(422).send(errors);
    return;
  }

  try {
    await messageColl.insertOne(req.body);
    res.sendStatus(201);
  } catch (err) {
    console.log(err);
  }
});


app.get("/messages", async (req, res) => {
    const messages = await messageColl.find().toArray();
    res.send(messages);
  });












app.listen(process.env.PORT, () =>
  console.log(`Server running in port ${process.env.PORT}`)
);
