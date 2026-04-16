const express = require("express");
const { body } = require("express-validator");
const {
  createRequest,
  sellerDecision,
  officerDecision,
  listRequests,
} = require("../controllers/registrationController");
const { protect, authorize } = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");

const router = express.Router();

router.get("/", protect, listRequests);

router.post(
  "/",
  protect,
  authorize("Buyer"),
  [body("propertyId").isMongoId().withMessage("Valid property id is required")],
  validate,
  createRequest
);

router.patch(
  "/:id/seller-decision",
  protect,
  authorize("Seller"),
  [
    body("status").isIn(["Approved", "Rejected"]).withMessage("Status must be Approved or Rejected"),
    body("note").optional().trim().isLength({ max: 500 }),
  ],
  validate,
  sellerDecision
);

router.patch(
  "/:id/officer-decision",
  protect,
  authorize("Admin", "Government Officer"),
  [
    body("status").isIn(["Approved", "Rejected"]).withMessage("Status must be Approved or Rejected"),
    body("note").optional().trim().isLength({ max: 500 }),
  ],
  validate,
  officerDecision
);

module.exports = router;
