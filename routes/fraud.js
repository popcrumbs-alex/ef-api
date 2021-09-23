const stripe = require("stripe")(process.env.STRIPE_LULU_LIVE);
const express = require("express");
const fs = require("fs/promises");
const { v4: uuidv4 } = require("uuid");
const Report = require("../models/Report");
const Transaction = require("../models/Transaction");
const { runBulkDisputeReport } = require("./middleware/BulkFraudReporting");
const { validateLocation } = require("./middleware/geocode");
const { validateEmail } = require("./middleware/validateEmail");
const router = express.Router();
const liveEndpointSecret = process.env.STRIPE_SIGN_SECRET;
const devEndpointSecret = process.env.STRIPE_SIGN_TEST;
const endpointSecret =
  process.env.NODE_ENV !== "production"
    ? devEndpointSecret
    : liveEndpointSecret;
//@route GET route
//@desc receive incoming payment to check fraud
//@access private
//Very basic fraud detection
router.post("/incoming_payment", async (req, res) => {
  ////////////////////////////////////////////
  const sig = req.headers["stripe-signature"];
  //stripe event
  let event;

  try {
    //Authenticate request from stripe API
    event = stripe.webhooks.constructEvent(req.body, sig, liveEndpointSecret);
  } catch (err) {
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }
  //@Steps
  //1. Receive customer info from stripe webhook
  //If no info is provided, add a fraud score
  //2. Validate customer on stripe
  //If customer has data with past fraudulent charges, mark that as possible fraud
  //3.Validate email:
  //If email has been used in fraud charges/disputes or is an invalid address, mark that as fraud or possilbly incorrect info
  //4. Validate customer address
  //If address is provided, confirm validate that address
  const transactionUnderReview = {};
  //set the basis for a fraud score
  //score will be out of 100
  let fraud_risk_score = 0;
  let paymentIntent;
  try {
    // Handle the event
    switch (event.type) {
      case "payment_intent.succeeded":
        ///////////////////////////////////////
        paymentIntent = event.data.object;
        console.log("payment intentorino", paymentIntent);
        ////////////////////////////////////////////////////////////////////
        //Deep validation on emails provided by purchase
        const emailIsValid = await validateEmail(paymentIntent.receipt_email);

        if (emailIsValid.valid) {
          //Set the email validity for transaction model to be true
          transactionUnderReview.valid_email = {
            isValid: true,
            reasons: emailIsValid.reasons,
          };
        }

        if (!emailIsValid.valid) {
          transactionUnderReview.valid_email = {
            isValid: false,
            reasons: emailIsValid.reasons,
          };
          //Invalid email is a +10
          fraud_risk_score = fraud_risk_score + 20;
        }

        //check if address is provided, if not, that is a high indication of fraud
        if (
          paymentIntent.shipping === null ||
          !paymentIntent.shipping.address
        ) {
          fraud_risk_score = fraud_risk_score + 40;
        }
        //Check for valid address here
        if (paymentIntent.shipping) {
          const geoCode = await validateLocation(
            paymentIntent.shipping.address
          );
          console.log("geo results", geoCode);

          if (geoCode.valid) {
            transactionUnderReview.valid_location = {
              isValid: true,
              reasons: geoCode.reasons,
            };
          }

          if (!geoCode.valid) {
            transactionUnderReview.valid_location = {
              isValid: false,
              reasons: geoCode.reasons,
            };
            fraud_risk_score = fraud_risk_score + 20;
          }
        }
        break;
      // ... handle other event types
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    transactionUnderReview.transaction_id = uuidv4();
    if (paymentIntent.shipping.name)
      transactionUnderReview.customer_name = paymentIntent.shipping.name;
    if (paymentIntent.receipt_email)
      transactionUnderReview.customer_email_address =
        paymentIntent.receipt_email;
    if (paymentIntent.shipping.address.line1)
      transactionUnderReview.street_line_1 =
        paymentIntent.shipping.address.line1;
    if (paymentIntent.shipping.address.city)
      transactionUnderReview.city = paymentIntent.shipping.address.city;
    if (paymentIntent.shipping.address.postal_code)
      transactionUnderReview.postal_code =
        paymentIntent.shipping.address.postal_code;
    if (paymentIntent.shipping.address.state)
      transactionUnderReview.state_code = paymentIntent.shipping.address.state;
    if (paymentIntent.shipping.address.country)
      transactionUnderReview.country = paymentIntent.shipping.address.country;
    if (paymentIntent.shipping.phone)
      transactionUnderReview.phone = paymentIntent.shipping.phone;

    //No need to create a fraud risk if the user scores under 40 percent
    switch (true) {
      case fraud_risk_score >= 60:
        transactionUnderReview.fraud_risk = `HIGH_FRAUD_POSSIBILITY: Payee has a fraud risk score of ${fraud_risk_score}, please review`;
        //Save the transaction in the database
        const newTransactionHighFraud = new Transaction({
          ...transactionUnderReview,
        });

        await newTransactionHighFraud.save();

        console.log("high fraud transaction:", newTransactionHighFraud);
        break;
      case fraud_risk_score >= 40 && fraud_risk_score < 60:
        transactionUnderReview.fraud_risk = `MEDIUM_FRAUD_POSSIBILITY: Payee has a fraud risk score of ${fraud_risk_score}, please review`;
        //Save the transaction in the database
        const newTransactionMedFraud = new Transaction({
          ...transactionUnderReview,
        });

        await newTransactionMedFraud.save();
        console.log("medium fraud transaction:", newTransactionMedFraud);
        break;
      default:
        console.log("Low fraud risk", fraud_risk_score);
        break;
    }

    return res.status(200).json({ msg: "Fraud Check Complete" });
  } catch (error) {
    console.error("error!", error);
    return res.status(200).json({ msg: "Error checking for fraud" });
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
    const report = await runBulkDisputeReport();

    // console.log(
    //   "report?",
    //   report.reportBody.filter((report) => report !== undefined)
    // );
    return res.json(report);
  } catch (error) {
    console.error("error", error);
    return res.status(500).json(error);
  }
});

module.exports = router;
