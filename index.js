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
messageColl.insertOne({from: name, to: 'Todos', text: 'entra na sala...', type: 'status', time: dayjs().format("HH:mm:ss")})


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

  const user = req.headers.user
  const limit = Number(req.query.limit)

 


  const messages = await messageColl.find().toArray();
  const filtered = await messageColl.find( { $or: [ { from: user }, { to: "Todos" }, { to: user }] } ).toArray()
//console.log(filtered)
  // const elem = await messageColl.find({"from" : user}).toArray()
  //console.log(elem)

  const limited = messages.slice(-limit, messages.length)
  res.send(filtered);
 
});








app.listen(process.env.PORT, () =>
  console.log(`Server running in port ${process.env.PORT}`)
);
