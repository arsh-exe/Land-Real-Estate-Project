require("dotenv").config({ path: __dirname + "/../.env" });
const mongoose = require("mongoose");
const Property = require("../src/models/Property");
const Document = require("../src/models/Document");
const User = require("../src/models/User");

const IMAGES = [
  "abby-rurenko-uOYak90r4L0-unsplash.jpg",
  "breno-assis-r3WAWU5Fi5Q-unsplash.jpg",
  "pexels-chris-pennes-2148746480-32802992.jpg",
  "pexels-henry-c-wong-877975-15413617.jpg",
  "todd-kent-178j8tJrNlc-unsplash.jpg",
  "vu-anh-TiVPTYCG_3E-unsplash.jpg"
];

const LOCATIONS = ["Delhi", "Mumbai", "Bangalore"];
const TYPES = ["Residential", "Commercial", "Agricultural", "Industrial", "Other"];

const seedProperties = async () => {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is not configured");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 20,
      minPoolSize: 5,
    });
    console.log("MongoDB connected");

    let users = await User.find({ role: "User" }).limit(1);
    if (!users.length) {
      users = await User.find({}).limit(1);
      if (!users.length) {
        console.error("No users found. Please seed users first.");
        process.exit(1);
      }
    }
    const owner = users[0];

    const properties = [];
    for (let i = 0; i < 20; i++) {
        // Create document for image
        const imgName = IMAGES[Math.floor(Math.random() * IMAGES.length)];
        const doc = await Document.create({
            documentId: `DOC-MOCK-${Date.now()}-${i}`,
            originalName: imgName,
            filePath: `/uploads/${imgName}`,
            mimeType: "image/jpeg",
            size: 500000,
            uploadedBy: owner._id,
        });

        // Create property
        const property = {
            propertyId: `PROP-MOCK-${Date.now()}-${i}`,
            titleNumber: `TN-${Math.floor(Math.random() * 1000000)}`,
            title: `Mock Property in ${LOCATIONS[i % LOCATIONS.length]} ${i + 1}`,
            location: LOCATIONS[i % LOCATIONS.length],
            type: TYPES[Math.floor(Math.random() * TYPES.length)],
            price: Math.floor(Math.random() * 10000000) + 1000000,
            area: Math.floor(Math.random() * 5000) + 500,
            approval: { status: "Approved" },
            isOpenForSale: true,
            owner: owner._id,
            documents: [doc._id],
        };
        properties.push(property);
    }

    const insertedProperties = await Property.insertMany(properties);

    // Update documents to point back to the property
    for (let p of insertedProperties) {
        await Document.updateMany({ _id: { $in: p.documents } }, { property: p._id });
    }

    console.log(`Successfully added 20 mock properties.`);
    process.exit(0);
  } catch (error) {
    console.error("Error seeding properties:", error.message);
    process.exit(1);
  }
};

seedProperties();
