const Property = require("../models/Property");
const Registration = require("../models/Registration");
const Transaction = require("../models/Transaction");
const generateId = require("../utils/generateId");

const createRequest = async (req, res, next) => {
  try {
    const { propertyId } = req.body;

    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    if (property.owner.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "Owner cannot request own property" });
    }

    const existingPending = await Registration.findOne({
      property: property._id,
      buyer: req.user._id,
      finalStatus: "Pending",
    });

    if (existingPending) {
      return res.status(409).json({ message: "A pending request already exists" });
    }

    const registration = await Registration.create({
      registrationId: generateId("REG"),
      property: property._id,
      buyer: req.user._id,
      seller: property.owner,
    });

    await Transaction.create({
      transactionId: generateId("TXN"),
      registration: registration._id,
      property: property._id,
      fromOwner: property.owner,
      toOwner: req.user._id,
      amount: property.price,
      status: "Pending",
      note: "Registration request created",
    });

    return res.status(201).json({ message: "Request submitted", registration });
  } catch (error) {
    next(error);
  }
};

const sellerDecision = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    const registration = await Registration.findById(id).populate("property");
    if (!registration) {
      return res.status(404).json({ message: "Registration not found" });
    }

    if (registration.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only seller can act on this request" });
    }

    if (registration.finalStatus !== "Pending") {
      return res.status(400).json({ message: "Request is already closed" });
    }

    registration.sellerDecision = {
      status,
      note,
      date: new Date(),
    };

    if (status === "Rejected") {
      registration.finalStatus = "Rejected";
      await Transaction.findOneAndUpdate(
        { registration: registration._id },
        { status: "Rejected", note: note || "Rejected by seller" },
        { new: true }
      );
    }

    await registration.save();

    return res.status(200).json({ message: `Seller marked request as ${status}`, registration });
  } catch (error) {
    next(error);
  }
};

const officerDecision = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    const registration = await Registration.findById(id)
      .populate("property")
      .populate("buyer");

    if (!registration) {
      return res.status(404).json({ message: "Registration not found" });
    }

    if (registration.sellerDecision.status !== "Approved") {
      return res.status(400).json({ message: "Seller approval required before officer verification" });
    }

    if (registration.finalStatus !== "Pending") {
      return res.status(400).json({ message: "Request is already closed" });
    }

    registration.officerDecision = {
      officer: req.user._id,
      status,
      note,
      date: new Date(),
    };
    registration.finalStatus = status;

    if (status === "Approved") {
      const property = registration.property;
      const oldOwner = property.owner;
      property.owner = registration.buyer._id;
      property.ownershipHistory.push({
        owner: registration.buyer._id,
        note: "Transferred after officer approval",
        transferredAt: new Date(),
      });
      await property.save();

      await Transaction.findOneAndUpdate(
        { registration: registration._id },
        {
          status: "Approved",
          fromOwner: oldOwner,
          toOwner: registration.buyer._id,
          note: note || "Approved by officer",
        },
        { new: true }
      );
    } else {
      await Transaction.findOneAndUpdate(
        { registration: registration._id },
        { status: "Rejected", note: note || "Rejected by officer" },
        { new: true }
      );
    }

    await registration.save();

    return res.status(200).json({ message: `Officer marked request as ${status}`, registration });
  } catch (error) {
    next(error);
  }
};

const listRequests = async (req, res, next) => {
  try {
    const filter = {};

    if (req.user.role === "Buyer") {
      filter.buyer = req.user._id;
    }

    if (req.user.role === "Seller") {
      filter.seller = req.user._id;
    }

    const registrations = await Registration.find(filter)
      .populate("property", "title location type price")
      .populate("buyer", "fullName email")
      .populate("seller", "fullName email")
      .populate("officerDecision.officer", "fullName email")
      .sort({ createdAt: -1 });

    return res.status(200).json({ registrations });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRequest,
  sellerDecision,
  officerDecision,
  listRequests,
};
