const stripe = require("stripe")(process.env.STRIPE_LULU_LIVE);
const express = require("express");
const fs = require("fs/promises");
const { v4: uuidv4 } = require("uuid");
const Report = require("../models/Report");
const Transaction = require("../models/Transaction");
const { FraudCheck } = require("./middleware/FraudCheck");
const { runDisputeReport } = require("./middleware/FraudReport");
const router = express.Router();

//@route GET route
//@desc receive incoming payment to check fraud
//@access private
router.post("/incoming_payment", async (req, res) => {
  //   console.log("payment incoming", req.body);

  try {
    const {
      data: { object },
    } = req.body;

    console.log("data", object);

    const charge = object.charges.data[0];

    const transaction_id = uuidv4();

    const date = new Date();
    // console.log("chargge", charge);

    const formatObjForEKATAPI = {
      evidence: {
        customer_name: object?.shipping?.name || "",
        customer_email_address: object?.receipt_email || "",
        customer_ip_address: "",
        street_line_1: object.shipping?.address?.line1 || "",
        city: object.shipping?.address?.city || "",
        postal_code: object.shipping?.address?.postal_code || "",
        state_code: object.shipping?.address?.state || "",
        country_code: object.shipping?.address?.country || "",
        phone: object.shipping?.phone || "",
        transaction_id,
        transaction_time: date,
      },
    };
    const checkforFraudASYNC = await FraudCheck(formatObjForEKATAPI.evidence);

    let newTransaction;

    const { caseRating, percentage } = checkforFraudASYNC;

    switch (caseRating) {
      case "HIGH":
        const highFraudCharge = await stripe.charges.update(charge.id, {
          metadata: {
            fraud_warning:
              "This charge scored a high risk of fraud, please review",
          },

          fraud_details: {
            user_report: "fraudulent",
          },
        });

        newTransaction = new Transaction({
          ...formatObjForEKATAPI.evidence,
          fraud_risk: "HIGH",
          fraud_percentage: percentage,
        });

        await newTransaction.save();

        console.log("HIGH FRAUD", newTransaction, highFraudCharge);
        return res.status(200).json({
          msg: "High level of fraud detected",
          charge: highFraudCharge,
        });
      case "MEDIUM":
        const mediumFraudCharge = await stripe.charges.update(charge.id, {
          metadata: {
            fraud_warning:
              "This charge scored over a 50% chance of being fraudulent, please review",
          },
          fraud_details: {
            user_report: "fraudulent",
          },
        });

        newTransaction = new Transaction({
          ...formatObjForEKATAPI.evidence,
          fraud_risk: "MEDIUM",
          fraud_percentage: percentage,
        });

        await newTransaction.save();
        console.log("MEDIUM FRAUD", mediumFraudCharge);
        return res
          .status(200)
          .json({ msg: "Possible fraud detected", charge: mediumFraudCharge });
      default:
        console.log("Low risk of fraud ");
        return res.status(200).json({ msg: "Webhook ok, no fraud detected" });
    }
  } catch (error) {
    console.error("error!", error);
    return res.status(500).json(error);
  }
});

//@route GET route
//@desc get report from id
//@access private
router.get("/report/:id", async (req, res) => {
  // const { _id } = req._id;
  console.log("repooorrrrtt", req.params.id);
  try {
    const foundReport = await Report.findById(req.params.id);
    console.log("found a report", foundReport);
    return res.json(foundReport);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: "Could not locate report" });
  }
});

//@route GET route
//@desc run dispute report
router.get("/disputes", async (req, res) => {
  try {
    const report = await runDisputeReport();

    console.log("report?", report);
    return res.json(report);
  } catch (error) {
    console.error("error", error);
    return res.status(500).json(error);
  }
});

module.exports = router;