const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require("express");
const bodyParser = require("body-parser");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");
const connectDB = require("./config/db");
const paymentRoutes = require("./routes/paymentRoutes");

const { signString } = require("./utils/tools");
const authToken = require("./service/authTokenService");
const createOrder = require("./service/createOrderService");
const createMandetOrder = require("./service/createMandetOrderService");

const app = express();
const server = http.createServer(app);

// Connect to Database
connectDB();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Allow cross-origin
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Authorization,X-API-KEY, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Request-Method"
  );
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PATCH, PUT, DELETE"
  );
  res.header("Allow", "GET, POST, PATCH, OPTIONS, PUT, DELETE");
  next();
});

// Your existing routes
app.post("/apply/h5token", function (req, res) {
  authToken.authToken(req, res);
});

app.post("/create/order", async (req, res) => {
  try {
    const resultRaq = await createOrder.createOrder(req, res);
    return res.send(resultRaq).status(200);
  } catch (error) {
    console.error("Error creating order:", error);
    return res.status(500).json({ error: error.message, code: error.code });
  }
});

app.post("/create/mandetOrder", function (req, res) {
  createMandetOrder.createMandetOrder(req, res);
});

app.post("/api/v1/notify", (req, res) => {
  // Handle your notification logic here
  res.status(201).json({ body: req.body });
});

app.use("/api/payment", paymentRoutes);
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/tts", require("./routes/ttsRoutes"));

// Start server
const serverPort = process.env.PORT || 3001;
server.listen(serverPort, () => {
  console.log("Server started, port:" + serverPort);
});
