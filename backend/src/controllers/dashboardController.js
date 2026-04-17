const Property = require("../models/Property");
const Registration = require("../models/Registration");
const Transaction = require("../models/Transaction");
const User = require("../models/User");

const getDashboardData = async (req, res, next) => {
  try {
    const { role, _id } = req.user;

    let data = {};

    if (role === "Buyer") {
      const assetStats = await Property.aggregate([
        { $match: { owner: _id } },
        { $group: { _id: null, totalValue: { $sum: "$price" } } },
      ]);
      const totalAssetsValue = assetStats.length > 0 ? assetStats[0].totalValue : 0;

      const myRequests = await Registration.find({ buyer: _id }).sort({ createdAt: -1 }).limit(10);
      data = {
        myRequestsCount: await Registration.countDocuments({ buyer: _id }),
        approvedCount: await Registration.countDocuments({ buyer: _id, finalStatus: "Approved" }),
        pendingCount: await Registration.countDocuments({ buyer: _id, finalStatus: "Pending" }),
        totalAssetsValue,
        myRequests,
      };
    } else if (role === "Seller") {
      const myPropertiesCount = await Property.countDocuments({ owner: _id });
      const assetStats = await Property.aggregate([
        { $match: { owner: _id } },
        { $group: { _id: null, totalValue: { $sum: "$price" } } },
      ]);
      const totalAssetsValue = assetStats.length > 0 ? assetStats[0].totalValue : 0;

      const myProperties = await Property.find({ owner: _id }).sort({ createdAt: -1 }).limit(10);
      const incomingRequests = await Registration.find({ seller: _id }).sort({ createdAt: -1 }).limit(10);
      data = {
        myPropertiesCount,
        totalAssetsValue,
        incomingRequestsCount: await Registration.countDocuments({ seller: _id }),
        pendingApprovals: await Registration.countDocuments({ seller: _id, "sellerDecision.status": "Pending" }),
        myProperties,
        incomingRequests,
      };
    } else {
      data = {
        usersCount: await User.countDocuments(),
        propertiesCount: await Property.countDocuments(),
        requestsCount: await Registration.countDocuments(),
        pendingVerificationCount: await Registration.countDocuments({
          "sellerDecision.status": "Approved",
          finalStatus: "Pending",
        }),
        recentTransactions: await Transaction.find().sort({ createdAt: -1 }).limit(12),
      };
    }

    return res.status(200).json({ role, data });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardData,
};
