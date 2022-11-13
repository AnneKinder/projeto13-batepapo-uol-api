import express from "express";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import cors from "cors";
import joi from "joi";
import dayjs from "dayjs";

//JOI
const partiSchema = joi.object({
  name: joi.string().required(),
});

const messageSchema = joi.object({
  text: joi.string().required(),
  to: joi.string().required(),
  type: joi.string().valid("private_message", "message").required(),
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
    lastStatus: Math.floor(Date.now() / 1000),
    //lastStatus: Date.now(),
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
    messageColl.insertOne({
      from: name,
      to: "Todos",
      text: "entra na sala...",
      type: "status",
      time: dayjs().format("HH:mm:ss"),
    });
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
  const user = req.headers.user;
  const newMessage = {
    from: user,
    to: to,
    text: text,
    type: type,
    time: dayjs().format("HH:mm:ss"),
  };

  const validation = messageSchema.validate(req.body, { abortEarly: false });

  if (validation.error) {
    const errors = validation.error.details.map((detail) => detail.message);
    res.status(422).send(errors);
    return;
  }

  try {
    const isPresent = await partiColl.findOne({ name: user });
    if (!isPresent) {
      res.status(404).send("Participante não está na lista");
      return;
    }

    await messageColl.insertOne(newMessage);
    res.sendStatus(201);
  } catch (err) {
    console.log(err);
  }
});

app.get("/messages", async (req, res) => {
  const user = req.headers.user;
  const limit = Number(req.query.limit);

  const filtered = await messageColl
    .find({ $or: [{ from: user }, { to: "Todos" }, { to: user }] })
    .toArray();

  const limited = filtered.slice(-limit, filtered.length);
  res.send(limited);
});

//status

app.post("/status", async (req, res) => {
  const user = req.headers.user;

  try {
    const containsUser = await partiColl.findOne({ name: user });
    if (!containsUser) {
      res.sendStatus(404);
      return;
    }

    await partiColl.updateOne(
      { name: user },
      { $set: { lastStatus: Math.floor(Date.now() / 1000) } }
    );
    res.sendStatus(200);
  } catch (err) {
    console.log(err);
  }
});

//online sweep

setInterval(async () => {
  try {
    let partiArray = await partiColl.find().toArray();
    let offlineUsers = await partiArray.filter(
      (parti) => parti.lastStatus <= Math.floor(Date.now() / 1000) - 10
    );

    await offlineUsers.forEach((obj) => {
      partiColl.deleteOne({ name: obj.name });
    });




  } catch (err) {
    console.log(err);
  }
}, 15000);

app.listen(process.env.PORT, () =>
  console.log(`Server running in port ${process.env.PORT}`)
);
