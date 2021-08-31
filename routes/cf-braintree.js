const express = require("express");
const braintree = require("braintree");
const router = express.Router();

const gateway = new braintree.BraintreeGateway({
  environment: braintree.Environment.Sandbox,
  merchantId: "your_merchant_id",
  publicKey: "your_public_key",
  privateKey: "your_private_key",
});

//@route POST route
//@desc Post a payment to braintree
//@access private
router.post("/transaction", async (req, res) => {
  try {
  } catch (error) {}
});
