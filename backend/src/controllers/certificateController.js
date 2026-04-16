const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const Document = require("../models/Document");
const Registration = require("../models/Registration");
const generateId = require("../utils/generateId");

const generateCertificate = async (req, res, next) => {
  try {
    const registration = await Registration.findById(req.params.registrationId)
      .populate("property")
      .populate("buyer", "fullName")
      .populate("seller", "fullName")
      .populate("officerDecision.officer", "fullName");

    if (!registration) {
      return res.status(404).json({ message: "Registration not found" });
    }

    if (registration.finalStatus !== "Approved") {
      return res.status(400).json({ message: "Certificate can only be generated for approved requests" });
    }

    const verifyUrl = `${process.env.CLIENT_URL || "http://localhost:5500"}/pages/property-details?id=${registration.property._id}`;
    const qrDataUrl = await QRCode.toDataURL(verifyUrl);
    const qrBuffer = Buffer.from(qrDataUrl.split(",")[1], "base64");

    const fileName = `${registration.registrationId}-certificate.pdf`;
    const absolutePath = path.join(__dirname, "..", "uploads", fileName);

    const doc = new PDFDocument({ margin: 40 });
    const writeStream = fs.createWriteStream(absolutePath);
    doc.pipe(writeStream);

    doc.fontSize(18).text("Government Land Registry Certificate", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Certificate ID: ${registration.registrationId}`);
    doc.text(`Property: ${registration.property.title}`);
    doc.text(`Location: ${registration.property.location}`);
    doc.text(`Area: ${registration.property.area}`);
    doc.text(`Transfer Amount: ${registration.property.price}`);
    doc.text(`Previous Owner: ${registration.seller.fullName}`);
    doc.text(`New Owner: ${registration.buyer.fullName}`);
    doc.text(`Verified By: ${registration.officerDecision.officer?.fullName || "Officer"}`);
    doc.text(`Verified On: ${new Date(registration.officerDecision.date).toLocaleString()}`);
    doc.moveDown();
    doc.text("Scan QR for verification", { align: "left" });
    doc.image(qrBuffer, { fit: [120, 120] });
    doc.end();

    await new Promise((resolve, reject) => {
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
    });

    const savedDocument = await Document.create({
      documentId: generateId("DOC"),
      originalName: fileName,
      filePath: `/uploads/${fileName}`,
      mimeType: "application/pdf",
      size: fs.statSync(absolutePath).size,
      uploadedBy: req.user._id,
      property: registration.property._id,
      registration: registration._id,
      kind: "CERTIFICATE",
    });

    return res.status(201).json({
      message: "Certificate generated",
      certificate: savedDocument,
      verifyUrl,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateCertificate,
};
