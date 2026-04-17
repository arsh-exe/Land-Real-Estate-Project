const express = require("express");
const { body } = require("express-validator");
const {
  createProperty,
  listProperties,
  listAllProperties,
  getPropertyById,
  updateProperty,
  deleteProperty,
  listMyProperties,
  listCurrentlySellingProperties,
  setPropertySaleStatus,
  listPendingApprovalProperties,
  setPropertyApprovalStatus,
} = require("../controllers/propertyController");
const { protect, authorize } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const validate = require("../middleware/validate");

const router = express.Router();

const propertyValidation = [
  body("title").optional().trim().notEmpty().withMessage("Title is required"),
  body("location").optional().trim().notEmpty().withMessage("Location is required"),
  body("price").optional().isFloat({ min: 0 }).withMessage("Price must be a valid number"),
  body("area").optional().isFloat({ min: 1 }).withMessage("Area must be a valid number"),
  body("type")
    .optional()
    .isIn(["Residential", "Commercial", "Agricultural", "Industrial", "Other"])
    .withMessage("Invalid property type"),
];

router.get("/", listProperties);
router.get("/all", protect, authorize("Admin", "Government Officer"), listAllProperties);
router.get("/my", protect, authorize("User", "Admin"), listMyProperties);
router.get(
  "/pending-approvals",
  protect,
  authorize("Admin", "Government Officer"),
  listPendingApprovalProperties
);
router.get(
  "/selling/current",
  protect,
  authorize("User", "Admin"),
  listCurrentlySellingProperties
);
router.patch(
  "/:id/approval",
  protect,
  authorize("Admin", "Government Officer"),
  [
    body("status")
      .isIn(["Approved", "Rejected"])
      .withMessage("status must be Approved or Rejected"),
    body("note").optional().trim().isLength({ max: 400 }).withMessage("note is too long"),
  ],
  validate,
  setPropertyApprovalStatus
);
router.patch(
  "/:id/sale-status",
  protect,
  authorize("User", "Admin"),
  [body("isOpenForSale").isBoolean().withMessage("isOpenForSale must be true or false")],
  validate,
  setPropertySaleStatus
);
router.get("/:id", getPropertyById);

router.post(
  "/",
  protect,
  authorize("User", "Admin"),
  upload.fields([
    { name: "images", maxCount: 10 },
    { name: "documents", maxCount: 5 }
  ]),
  [
    body("title").trim().notEmpty().withMessage("Title is required"),
    body("location").trim().notEmpty().withMessage("Location is required"),
    body("price").isFloat({ min: 0 }).withMessage("Price must be a valid number"),
    body("area").isFloat({ min: 1 }).withMessage("Area must be a valid number"),
    body("type")
      .optional()
      .isIn(["Residential", "Commercial", "Agricultural", "Industrial", "Other"])
      .withMessage("Invalid property type"),
  ],
  validate,
  createProperty
);

router.put(
  "/:id",
  protect,
  authorize("User", "Admin", "Government Officer"),
  upload.fields([
    { name: "images", maxCount: 10 },
    { name: "documents", maxCount: 5 }
  ]),
  propertyValidation,
  validate,
  updateProperty
);

router.delete("/:id", protect, authorize("User", "Admin"), deleteProperty);

module.exports = router;
