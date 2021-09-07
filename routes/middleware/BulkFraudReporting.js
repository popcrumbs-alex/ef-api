const stripe = require("stripe")(process.env.STRIPE_LULU_LIVE);
const { FraudCheck } = require("./FraudCheck");
const { format } = require("date-fns");
const mailgun = require("mailgun-js");
const Report = require("../../models/Report");
const mg = mailgun({
  apiKey: process.env.MAILGUN_API_KEY,
  domain: "sandboxf00916c1597e4395bbbe3ad940fd43bb.mailgun.org",
});

module.exports.runBulkDisputeReport = async () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 10);
  const yesterdayTime = Math.round(yesterday.getTime() / 1000);
  const yesterdayFormatted = format(yesterday, "P");
  try {
    const disputes = await stripe.disputes.list({
      limit: 100,
      created: { gte: yesterdayTime },
    });

    const fraudDisputes = disputes.data.filter((dis) => {
      return dis.reason === "fraudulent";
    });

    const checked = await Promise.all(
      fraudDisputes.map(async (dispute) => {
        try {
          const addressSplit = dispute.evidence.shipping_address.split(",");

          const formatObjForEKATAPI = {
            evidence: {
              customer_name: dispute.evidence?.customer_name || "",
              customer_email_address:
                dispute.evidence?.customer_email_address || "",
              customer_ip_address: dispute.evidence?.customer_purchase_ip || "",
              street_line_1: dispute.evidence?.shipping_address,
              city: "",
              postal_code: addressSplit[addressSplit.length - 2] || "",
              state_code: addressSplit[addressSplit.length - 3] || "",
              country_code: addressSplit[addressSplit.length - 1] || "",
              phone: "",
              transaction_id: dispute.charge,
              transaction_time: dispute.created,
            },
          };
          const fraudCheckASYNC = await FraudCheck(
            formatObjForEKATAPI.evidence
          );

          const { caseRating, percentage } = fraudCheckASYNC;

          if (caseRating !== "LOW") {
            const adjustedDispute = {
              ...dispute,
              fraud_risk: caseRating,
              fraud_details: `This user scored a ${caseRating} risk, please review`,
              fraud_score: percentage + "%",
            };

            //   console.log("fraud check", adjustedDispute);
            return adjustedDispute;
          }
          return;
        } catch (error) {
          console.error("error!", error);
          return error;
        }
      })
    );

    const filterCheck = checked.filter((item) => {
      console.log("item!", !item ? "no item" : item.id);
      return item;
    });

    const data = {
      reportBody: filterCheck,
      reportDate: yesterdayFormatted,
    };

    const newReport = new Report(data);

    await newReport.save();

    const yesterdayAPI = `https://ef-api-bridge.herokuapp.com/api/fraud/report/${newReport._id}`;

    const msg = {
      from: "Fraud Report, lordoffraud@popcrumbs.com",
      to: "alex@popcrumbs.com, rcantar@popcrumbs.com",
      subject: "Fraud Report:" + yesterdayFormatted + "to 9/1/21",
      html: `<p>Fraud report for yesterday can be accessed <a href=${yesterdayAPI}/>${yesterdayAPI}</a>

      </p>
      <p>Please see attached file to be added to script editor in google sheets. Name the file ImportJSON.<br /></p>
      <p>Call the function from A1 in the sheets like this =ImportJSON("${yesterdayAPI}")</p>`,
      attachment: `googlescripts/ImportJSON.js`,
    };

    mg.messages().send(msg, function (error, body) {
      if (error) console.log("error", error);
      console.log("msg body?", body);
    });

    return newReport;
  } catch (error) {
    console.log("error", error);
    return error;
  }
};
