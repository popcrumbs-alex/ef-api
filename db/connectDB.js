const mongoose = require("mongoose");
const db = process.env.MONGO_URI;

const connectDB = async () => {
  try {
    await mongoose.connect(db, {
      useNewUrlParser: true,
      useCreateIndex: true,
      useFindAndModify: false,
      useUnifiedTopology: true,
    });

    console.log("Mongo DB connected...");
  } catch (err) {
    console.log(err.message);
    //exit process with failure
    process.exit(1);
  }
};

module.exports = connectDB;
