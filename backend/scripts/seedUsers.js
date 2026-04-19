require("dotenv").config({ path: __dirname + "/../.env" });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../src/models/User");

const seedUsers = async () => {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is not configured");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 20,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
    });
    console.log("MongoDB connected");

    const hashedPassword = await bcrypt.hash("password123", 12);

    const newUsers = Array.from({ length: 10 }).map((_, index) => {
      const timestamp = Date.now();
      return {
        fullName: `Mock User ${timestamp} ${index}`,
        email: `mockuser${timestamp}${index}@example.com`,
        password: hashedPassword,
        role: "User",
        isActive: true,
      };
    });

    await User.insertMany(newUsers);
    console.log(`Successfully added ${newUsers.length} dummy users.`);

    process.exit(0);
  } catch (error) {
    console.error("Error seeding users:", error.message);
    process.exit(1);
  }
};

seedUsers();
