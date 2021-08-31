const mongoose = require("mongoose");

const ReportSchema = new mongoose.Schema({
  reportBody: {
    type: Array,
  },
  reportDate: {
    type: String,
  },
});

module.exports = Report = mongoose.model("Report", ReportSchema);
