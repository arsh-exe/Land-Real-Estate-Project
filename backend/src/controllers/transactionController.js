const Transaction = require("../models/Transaction");

const listTransactions = async (req, res, next) => {
  try {
    const filter = {};

    if (req.user.role === "Buyer") {
      filter.toOwner = req.user._id;
    }

    if (req.user.role === "Seller") {
      filter.fromOwner = req.user._id;
    }

    const transactions = await Transaction.find(filter)
      .populate("property", "title location")
      .populate("fromOwner", "fullName")
      .populate("toOwner", "fullName")
      .populate("registration", "registrationId finalStatus")
      .sort({ createdAt: -1 });

    return res.status(200).json({ transactions });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listTransactions,
};
