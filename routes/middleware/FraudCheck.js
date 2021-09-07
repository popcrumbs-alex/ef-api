const { default: axios } = require("axios");

module.exports.FraudCheck = async (obj) => {
  console.log("transaction ud", obj);
  try {
    const match = await axios({
      method: "GET",
      url: `https://api.ekata.com/2.0/transaction_risk?api_key=${
        process.env.EKATA_API_KEY
      }&transaction_id=${obj.transaction_id}
    &transaction_time=${obj.transaction_time}
    &primary.name=${obj.customer_name}&primary.email_address=${
        obj.customer_email_address
      }&ip_address=${
        obj.customer_purchase_ip || ""
      }&primary.address.street_line_1=${
        obj.street_line_1
      }&primary.address.city=${obj.city}&primary.address.postal_code=${
        obj.postal_code
      }&primary.address.state_code=${
        obj.state_code
      }&primary.address.country_code=${obj.country_code}&primary.phone=${
        obj.phone
      }`,
    });

    console.log("match", match.data);

    const convertFraudToPercentage = (score_1, score_2) => {
      if (!score_1 || !score_2) return;
      //this score is from 0 - 1;
      const percentOne = score_1 * 100;
      const percentTwo = (score_2 / 500) * 100;

      return (percentOne + percentTwo) / 2;
    };

    const fraudLikelyPercentage = Math.floor(
      convertFraudToPercentage(
        match.data.identity_network_score,
        match.data.identity_risk_score
      )
    );

    console.log("fraud percent", fraudLikelyPercentage);

    if (fraudLikelyPercentage >= 50 && fraudLikelyPercentage <= 74) {
      return { caseRating: "MEDIUM", percentage: fraudLikelyPercentage };
    }

    if (fraudLikelyPercentage > 75) {
      //this is a high chance of fraud
      return { caseRating: "HIGH", percentage: fraudLikelyPercentage };
    }

    return { caseRating: "LOW", percentage: fraudLikelyPercentage || 0 };
  } catch (error) {
    console.error("error checking fraud", error);

    return error;
  }
};
