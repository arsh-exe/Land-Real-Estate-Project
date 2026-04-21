const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const { generateAndAttachCertificate } = require("./src/utils/certificateGenerator");

async function run() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/land_registry");
  console.log("Connected to DB");

  const Property = require("./src/models/Property");
  const prop = await Property.findOne().sort({ createdAt: -1 });

  if (!prop) {
    console.log("No properties found");
    process.exit(0);
  }

  console.log("Generating for property:", prop._id);
  try {
    await generateAndAttachCertificate(prop._id, prop.owner);
    console.log("Success");
  } catch (err) {
    console.error(err);
  }

  process.exit(0);
}

run();
