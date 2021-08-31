module.exports.checkAuth = async (req, res, next) => {
  try {
    const authCode = req.headers["x-auth-code"];
    console.log("authcode", authCode);

    if (authCode !== process.env.ADMIN_AUTH) {
      return res.status(500).json({ msg: "Incorrect Auth Code" });
    }
    next();
  } catch (error) {
    console.log("error", error);
  }
};
