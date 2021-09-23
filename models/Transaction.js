const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema({
  transaction_id: {
    type: String,
  },
  transaction_time: {
    type: Date,
    default: Date.now,
  },
  fraud_risk: {
    type: String,
  },
  fraud_risk_score: {
    type: Number,
  },
  customer_name: {
    type: String,
  },
  customer_email_address: {
    type: String,
  },
  valid_email: {
    isValid: {
      type: Boolean,
    },
    reasons: {
      type: Object,
    },
  },
  valid_location: {
    isValid: {
      type: Boolean,
    },
    reasons: {
      type: Object,
    },
  },
  customer_ip_address: {
    type: String,
  },
  street_line_1: {
    type: String,
  },
  city: {
    type: String,
  },
  postal_code: {
    type: String,
  },
  state_code: {
    type: String,
  },
  country_code: {
    type: String,
  },
  phone: {
    type: String,
  },
});

module.exports = Transaction = mongoose.model("Transaction", TransactionSchema);
