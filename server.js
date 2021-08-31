// require("dotenv").config();
const express = require("express");
const http = require("http");
const app = express();
const cors = require("cors");
const cron = require("node-cron");
const { runDisputeReport } = require("./routes/middleware/FraudReport.js");
const connectDB = require("./db/connectDB.js");

connectDB();

module.exports.stripe = require("stripe")(
  process.env.NODE_ENV === "development"
    ? process.env.STRIPE_TEST_SECRET
    : process.env.STRIPE_LIVE_SECRET
);

app.use(cors({ origin: "*" }));
app.use(express.json({ extended: true }));

app.get("/", (req, res) => res.send("CF-EF-BRIDGE API IS RUNNING"));

app.post("/funnel_webhooks/test", async (req, res) => {
  const currentDate = new Date();
  const utcDate = currentDate.toISOString() + " UTC";
  req.headers["content-type"] = "application/json";
  req.headers["X-Clickfunnels-Webhook-Delivery-Id"] =
    process.env.CF_DELIVERY_ID;
  req.headers["payload"] = { time: utcDate };

  try {
    res.status(200).send({ msg: "Okay" });
  } catch (error) {
    res.status(500).send({ msg: "Internal Server Error" });
  }
});

app.use("/api/cf-data", require("./routes/api.js"));
app.use("/api/stripe", require("./routes/subscriptions"));
app.use("/api/fraud", require("./routes/fraud"));

//Create report at 10am and email it
cron.schedule("00 00 10 * * *", async () => {
  await runDisputeReport();
});

const server = http.createServer(app);

const PORT = process.env.PORT || "5000";

server.listen(PORT, () => console.log(`Server is running at port:${PORT}`));
