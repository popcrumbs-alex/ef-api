const { validate } = require("deep-email-validator");

module.exports.validateEmail = async (email = "") => {
  try {
    if (!email) return { valid: false, reasons: { msg: "No email provided" } };

    const response = await validate({
      email,
      validateRegex: true,
      validateMx: true,
      validateTypo: true,
      validateDisposable: true,
      validateSMTP: false,
    });
    console.log("response", response.valid, response.validators);
    return { valid: response.valid, reasons: response.validators };
  } catch (error) {
    console.log("ERROR VALIDATING EMAIL", error);
    return { valid: false, reasons: error };
  }
};
