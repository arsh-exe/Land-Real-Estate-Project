const express = require("express");
const { generateCertificate } = require("../controllers/certificateController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.post(
  "/:registrationId",
  protect,
  authorize("Admin", "Government Officer"),
  generateCertificate
);

module.exports = router;
