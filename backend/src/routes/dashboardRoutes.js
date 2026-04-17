const express = require("express");
const { getDashboardData } = require("../controllers/dashboardController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, authorize("Admin", "Government Officer", "User", "Buyer", "Seller"), getDashboardData);

module.exports = router;
