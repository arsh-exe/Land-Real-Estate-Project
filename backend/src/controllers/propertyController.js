const Document = require("../models/Document");
const Property = require("../models/Property");
const Registration = require("../models/Registration");
const generateId = require("../utils/generateId");

const createProperty = async (req, res, next) => {
  try {
    const { title, titleNumber, location, price, area, type } = req.body;
    const normalizedTitleNumber = String(titleNumber || "").trim();

    const property = await Property.create({
      propertyId: generateId("PROP"),
      titleNumber: normalizedTitleNumber || generateId("TITLE"),
      title,
      location,
      price,
      area,
      type,
      owner: req.user._id,
      ownershipHistory: [
        {
          owner: req.user._id,
          note: "Initial registration",
        },
      ],
    });

    // Handle files from both 'images' and 'documents' fields
    const allFiles = [
      ...(req.files?.images || []),
      ...(req.files?.documents || [])
    ];

    if (allFiles.length > 0) {
      const docs = await Promise.all(
        allFiles.map((file) =>
          Document.create({
            documentId: generateId("DOC"),
            originalName: file.originalname,
            filePath: `/uploads/${file.filename}`,
            mimeType: file.mimetype,
            size: file.size,
            uploadedBy: req.user._id,
            property: property._id,
            kind: "PROPERTY_DOC",
          })
        )
      );

      property.documents = docs.map((doc) => doc._id);
      await property.save();
    }

    // Re-fetch and populate the property before returning
    const populatedProperty = await Property.findById(property._id)
      .populate("owner", "fullName email role")
      .populate("documents");

    return res.status(201).json({ message: "Property created", property: populatedProperty });
  } catch (error) {
    next(error);
  }
};

const listProperties = async (req, res, next) => {
  try {
    const {
      location,
      type,
      minPrice,
      maxPrice,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    const filter = {};
    if (location) filter.location = { $regex: location, $options: "i" };
    if (type) filter.type = type;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    const sort = { [sortBy]: order === "asc" ? 1 : -1 };

    const properties = await Property.find(filter)
      .populate("owner", "fullName email role")
      .populate("documents")
      .sort(sort);

    return res.status(200).json({ count: properties.length, properties });
  } catch (error) {
    next(error);
  }
};

const getPropertyById = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate("owner", "fullName email role")
      .populate("ownershipHistory.owner", "fullName email")
      .populate("documents");

    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    const approvedRegistration = await Registration.findOne({
      property: property._id,
      finalStatus: "Approved",
    }).select("_id");

    let propertyStatus = "Available";
    if (approvedRegistration) {
      propertyStatus = "Sold";
    } else {
      const pendingRegistration = await Registration.findOne({
        property: property._id,
        finalStatus: "Pending",
      }).select("_id");

      if (pendingRegistration) {
        propertyStatus = "Pending Request";
      }
    }

    return res.status(200).json({ property, propertyStatus });
  } catch (error) {
    next(error);
  }
};

const updateProperty = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    const ownerId = property.owner ? property.owner.toString() : null;
    const canEdit =
      ownerId === req.user._id.toString() ||
      ["Admin", "Government Officer"].includes(req.user.role);

    if (!canEdit) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const updates = (({ title, location, price, area, type }) => ({
      title,
      location,
      price,
      area,
      type,
    }))(req.body);

    Object.keys(updates).forEach((key) => {
      if (updates[key] !== undefined && updates[key] !== null && updates[key] !== "") {
        property[key] = updates[key];
      }
    });

    // Handle files from both 'images' and 'documents' fields
    const allFiles = [
      ...(req.files?.images || []),
      ...(req.files?.documents || [])
    ];

    if (allFiles.length > 0) {
      const docs = await Promise.all(
        allFiles.map((file) =>
          Document.create({
            documentId: generateId("DOC"),
            originalName: file.originalname,
            filePath: `/uploads/${file.filename}`,
            mimeType: file.mimetype,
            size: file.size,
            uploadedBy: req.user._id,
            property: property._id,
            kind: "PROPERTY_DOC",
          })
        )
      );

      property.documents.push(...docs.map((doc) => doc._id));
    }

    await property.save();

    // Re-fetch and populate the property before returning
    const populatedProperty = await Property.findById(property._id)
      .populate("owner", "fullName email role")
      .populate("documents");

    return res.status(200).json({ message: "Property updated", property: populatedProperty });
  } catch (error) {
    next(error);
  }
};

const deleteProperty = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    const ownerId = property.owner ? property.owner.toString() : null;
    const canDelete =
      ownerId === req.user._id.toString() || req.user.role === "Admin";

    if (!canDelete) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await property.deleteOne();
    return res.status(200).json({ message: "Property deleted" });
  } catch (error) {
    next(error);
  }
};

const listMyProperties = async (req, res, next) => {
  try {
    const properties = await Property.find({ owner: req.user._id })
      .populate("documents")
      .sort({ createdAt: -1 });

    return res.status(200).json({ properties });
  } catch (error) {
    next(error);
  }
};

const listCurrentlySellingProperties = async (req, res, next) => {
  try {
    const pendingRegistrations = await Registration.find({
      seller: req.user._id,
      finalStatus: "Pending",
      "sellerDecision.status": { $in: ["Pending", "Approved"] },
    }).select("property");

    const propertyIds = [
      ...new Set(
        pendingRegistrations
          .map((registration) => registration?.property)
          .filter(Boolean)
          .map((propertyId) => String(propertyId))
      ),
    ];

    if (!propertyIds.length) {
      return res.status(200).json({ properties: [] });
    }

    const properties = await Property.find({
      _id: { $in: propertyIds },
      owner: req.user._id,
    })
      .populate("owner", "fullName email role")
      .populate("documents")
      .sort({ updatedAt: -1 });

    if (!properties.length) {
      return res.status(200).json({ properties: [] });
    }

    const requestCounts = await Registration.aggregate([
      {
        $match: {
          seller: req.user._id,
          finalStatus: "Pending",
          "sellerDecision.status": { $in: ["Pending", "Approved"] },
          property: { $in: properties.map((property) => property._id) },
        },
      },
      {
        $group: {
          _id: "$property",
          pendingRequestsCount: { $sum: 1 },
        },
      },
    ]);

    const requestCountMap = new Map(
      requestCounts.map((entry) => [String(entry._id), entry.pendingRequestsCount])
    );

    const data = properties.map((property) => ({
      ...property.toObject(),
      pendingRequestsCount: requestCountMap.get(String(property._id)) || 0,
    }));

    return res.status(200).json({ properties: data });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProperty,
  listProperties,
  getPropertyById,
  updateProperty,
  deleteProperty,
  listMyProperties,
  listCurrentlySellingProperties,
};
