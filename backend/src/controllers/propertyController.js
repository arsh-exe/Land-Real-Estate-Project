const Document = require("../models/Document");
const Property = require("../models/Property");
const Registration = require("../models/Registration");
const generateId = require("../utils/generateId");

const createProperty = async (req, res, next) => {
  try {
    const { title, titleNumber, location, price, area, type } = req.body;
    const normalizedTitleNumber = String(titleNumber || "").trim();
    const documentFiles = req.files?.documents || [];

    if (!documentFiles.length) {
      return res.status(400).json({ message: "At least one property document is required" });
    }

    const needsGovernmentApproval = req.user.role === "User";

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
      approval: needsGovernmentApproval
        ? { status: "Pending" }
        : {
            status: "Approved",
            reviewedBy: req.user._id,
            reviewedAt: new Date(),
            note: "Auto-approved by system role",
          },
      isOpenForSale: false,
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

    return res.status(201).json({
      message: needsGovernmentApproval
        ? "Property submitted for government approval"
        : "Property created",
      property: populatedProperty,
    });
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
      onlyForSale,
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
    if (String(onlyForSale).toLowerCase() === "true") {
      filter.isOpenForSale = true;
    }
    filter["approval.status"] = "Approved";

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

const listAllProperties = async (req, res, next) => {
  try {
    const {
      location,
      type,
      minPrice,
      maxPrice,
      onlyForSale,
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
    if (String(onlyForSale).toLowerCase() === "true") {
      filter.isOpenForSale = true;
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

    const updates = (({ title, location, price, area, type, isOpenForSale }) => ({
      title,
      location,
      price,
      area,
      type,
      isOpenForSale,
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

    if (ownerId === req.user._id.toString() && property.approval?.status === "Rejected") {
      property.approval = {
        status: "Pending",
        reviewedBy: undefined,
        reviewedAt: undefined,
        note: "Resubmitted by owner after document/property update",
      };
      property.isOpenForSale = false;
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

    const activeTransferPropertyIds = [
      ...new Set(
        pendingRegistrations
          .map((registration) => registration?.property)
          .filter(Boolean)
          .map((propertyId) => String(propertyId))
      ),
    ];

    const properties = await Property.find({
      owner: req.user._id,
      "approval.status": "Approved",
      $or: [
        { isOpenForSale: true },
        { _id: { $in: activeTransferPropertyIds } },
      ],
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
    const activeTransferIdSet = new Set(activeTransferPropertyIds);

    const data = properties.map((property) => ({
      ...property.toObject(),
      pendingRequestsCount: requestCountMap.get(String(property._id)) || 0,
      hasActiveTransferRequest: activeTransferIdSet.has(String(property._id)),
    }));

    return res.status(200).json({ properties: data });
  } catch (error) {
    next(error);
  }
};

const setPropertySaleStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isOpenForSale } = req.body;

    if (typeof isOpenForSale !== "boolean") {
      return res.status(400).json({ message: "isOpenForSale must be a boolean" });
    }

    const property = await Property.findById(id);
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    const ownerId = property.owner ? property.owner.toString() : null;
    const canUpdate = ownerId === req.user._id.toString() || req.user.role === "Admin";
    if (!canUpdate) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (property.approval?.status !== "Approved") {
      return res.status(400).json({ message: "Property must be government-approved before selling" });
    }

    property.isOpenForSale = isOpenForSale;
    await property.save();

    return res.status(200).json({
      message: isOpenForSale ? "Property marked as open for sale" : "Property removed from sale",
      property,
    });
  } catch (error) {
    next(error);
  }
};

const listPendingApprovalProperties = async (req, res, next) => {
  try {
    const properties = await Property.find({ "approval.status": "Pending" })
      .populate("owner", "fullName email role")
      .populate("documents")
      .sort({ createdAt: -1 });

    return res.status(200).json({ properties });
  } catch (error) {
    next(error);
  }
};

const setPropertyApprovalStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    const property = await Property.findById(id);
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    property.approval = {
      status,
      note,
      reviewedBy: req.user._id,
      reviewedAt: new Date(),
    };

    if (status !== "Approved") {
      property.isOpenForSale = false;
    }

    await property.save();

    return res.status(200).json({
      message: `Property ${status.toLowerCase()} by government review`,
      property,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
