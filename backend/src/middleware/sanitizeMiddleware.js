const isObject = (value) => value && typeof value === "object" && !Array.isArray(value);

const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== "object") {
    return;
  }

  if (Array.isArray(obj)) {
    obj.forEach((item) => sanitizeObject(item));
    return;
  }

  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    const sanitizedKey = key.replace(/\$/g, "").replace(/\./g, "");

    if (sanitizedKey !== key) {
      delete obj[key];
      if (sanitizedKey) {
        obj[sanitizedKey] = value;
      }
    }

    const nextKey = sanitizedKey !== key ? sanitizedKey : key;
    const nextValue = obj[nextKey];

    if (isObject(nextValue) || Array.isArray(nextValue)) {
      sanitizeObject(nextValue);
    }
  });
};

const sanitizeRequest = (req, res, next) => {
  sanitizeObject(req.body);
  sanitizeObject(req.params);
  sanitizeObject(req.query);
  next();
};

module.exports = sanitizeRequest;
