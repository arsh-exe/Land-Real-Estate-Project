const express = require("express");
const { body } = require("express-validator");
const {
  createProperty,
  listProperties,
  getPropertyById,
  updateProperty,
  deleteProperty,
  listMyProperties,
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
router.get("/my", protect, authorize("Seller", "Admin", "Buyer"), listMyProperties);
router.get("/:id", getPropertyById);

router.post(
  "/",
  protect,
  authorize("Seller", "Admin"),
  upload.array("documents", 5),
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
  authorize("Seller", "Admin", "Government Officer"),
  upload.array("documents", 5),
  propertyValidation,
  validate,
  updateProperty
);

router.delete("/:id", protect, authorize("Seller", "Admin"), deleteProperty);

module.exports = router;
