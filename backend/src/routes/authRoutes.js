const express = require("express");
const { body } = require("express-validator");
const {
  signup,
  login,
  getMe,
  logout,
  listUsers,
} = require("../controllers/authController");
const { protect, authorize } = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");

const router = express.Router();

router.post(
  "/signup",
  [
    body("fullName").trim().notEmpty().withMessage("Full name is required"),
    body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),
    body("role")
      .optional()
      .isIn(["Admin", "User", "Government Officer"])
      .withMessage("Invalid role"),
  ],
  validate,
  signup
);

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  validate,
  login
);

router.post("/logout", protect, logout);
router.get("/me", protect, getMe);
router.get("/users", protect, authorize("Admin", "Government Officer"), listUsers);

module.exports = router;
