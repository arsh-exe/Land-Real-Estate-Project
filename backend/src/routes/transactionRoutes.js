const express = require("express");
const { listTransactions } = require("../controllers/transactionController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, authorize("Admin", "Government Officer", "User"), listTransactions);

module.exports = router;
