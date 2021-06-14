require('dotenv').config();
const express = require("express");
const http = require("http");
const app = express();
const cors = require('cors')

app.use(cors({ origin: "*" }))
app.use(express.json({ extended: true }));

app.get("/", (req, res) => res.send("CF-EF-BRIDGE API IS RUNNING"));

app.post('/funnel_webhooks/test', async (req, res) => {
    const currentDate = new Date();
    const utcDate = currentDate.toISOString() + " UTC"
    req.headers["content-type"] = "application/json";
    req.headers["X-Clickfunnels-Webhook-Delivery-Id"] =
        process.env.CF_DELIVERY_ID;;
    req.headers["payload"] = { "time": utcDate }

    try {
        res.status(200).send({ msg: 'Okay' })
    } catch (error) {
        res.status(500).send({ msg: 'Internal Server Error' })
    }
})
app.use("/api/cf-data", require("./routes/api.js"));

const server = http.createServer(app);

const PORT = process.env.PORT || "5000";

server.listen(PORT, () => console.log(`Server is running at port:${PORT}`));
