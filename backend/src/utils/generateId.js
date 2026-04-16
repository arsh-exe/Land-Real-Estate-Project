const crypto = require("crypto");

const generateId = (prefix) => {
  const token = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `${prefix}-${Date.now()}-${token}`;
};

module.exports = generateId;
