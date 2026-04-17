require("dotenv").config();
const mongoose = require("mongoose");

const connectDB = require("../src/config/db");
const User = require("../src/models/User");

const migrateLegacyRoles = async () => {
  try {
    await connectDB();

    const beforeBuyer = await User.countDocuments({ role: "Buyer" });
    const beforeSeller = await User.countDocuments({ role: "Seller" });
    const beforeUser = await User.countDocuments({ role: "User" });

    const result = await User.updateMany(
      { role: { $in: ["Buyer", "Seller"] } },
      { $set: { role: "User" } }
    );

    const afterBuyer = await User.countDocuments({ role: "Buyer" });
    const afterSeller = await User.countDocuments({ role: "Seller" });
    const afterUser = await User.countDocuments({ role: "User" });

    console.log("Legacy role migration completed.");
    console.log(`Matched users: ${result.matchedCount}`);
    console.log(`Modified users: ${result.modifiedCount}`);
    console.log(
      `Before -> Buyer: ${beforeBuyer}, Seller: ${beforeSeller}, User: ${beforeUser}`
    );
    console.log(
      `After  -> Buyer: ${afterBuyer}, Seller: ${afterSeller}, User: ${afterUser}`
    );
  } catch (error) {
    console.error("Legacy role migration failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

migrateLegacyRoles();
