const { default: axios } = require("axios");

module.exports.validateLocation = async (address = null) => {
  try {
    if (address === null)
      return { valid: false, reasons: { msg: "No address provided" } };

    const formatAddress = `${address.line1}+${address.city}+${address.state}+${address.postal_code}`;

    const geoResponse = await axios({
      method: "GET",
      url: `https://maps.googleapis.com/maps/api/geocode/json?address=${formatAddress}&key=${process.env.GEOCODING_API}`,
    });

    console.log("gsdfsdgs", geoResponse.data, process.env.GEOCODING_API);

    return {
      valid: geoResponse.data.status === "OK",
      reasons: { ...geoResponse.data.results, status: geoResponse.data.status },
    };
  } catch (error) {
    console.log("ERROR IN GEOCODING API:", error);

    return { valid: false, reasons: error };
  }
};
