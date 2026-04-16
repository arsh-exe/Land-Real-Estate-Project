const mongoose = require("mongoose");

const ownershipEntrySchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    transferredAt: {
      type: Date,
      default: Date.now,
    },
    note: {
      type: String,
      default: "Initial registration",
    },
  },
  { _id: false }
);

const propertySchema = new mongoose.Schema(
  {
    propertyId: {
      type: String,
      required: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["Residential", "Commercial", "Agricultural", "Industrial", "Other"],
      default: "Residential",
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    area: {
      type: Number,
      required: true,
      min: 1,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    documents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Document",
      },
    ],
    ownershipHistory: [ownershipEntrySchema],
  },
  {
    timestamps: true,
  }
);

propertySchema.index({ location: 1, type: 1, price: 1 });

module.exports = mongoose.model("Property", propertySchema);
