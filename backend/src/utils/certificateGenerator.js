const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const cloudinary = require("cloudinary").v2;
const Document = require("../models/Document");
const Property = require("../models/Property");
const User = require("../models/User");
const generateId = require("./generateId");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const generateAndAttachCertificate = async (propertyId, officerId, transactionData = null) => {
  try {
    const property = await Property.findById(propertyId).populate("owner", "fullName");
    if (!property) throw new Error("Property not found for certificate generation");

    // 1. Delete old certificates for this property
    const oldCerts = await Document.find({ property: property._id, kind: "CERTIFICATE" });
    for (const cert of oldCerts) {
      try {
        if (cert.filePath && cert.filePath.includes("cloudinary.com")) {
          // Extract public_id roughly (assuming folder/filename structure)
          const parts = cert.filePath.split("/");
          const filename = parts.pop();
          const folder = parts.pop();
          const publicId = `${folder}/${filename.split(".")[0]}`;
          await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
        } else if (cert.filePath) {
          const absolutePath = path.join(__dirname, "..", "..", cert.filePath.startsWith("/") ? cert.filePath.slice(1) : cert.filePath);
          // Fallback if filePath doesn't resolve correctly:
          const altPath = path.join(__dirname, "..", "uploads", path.basename(cert.filePath));
          
          if (fs.existsSync(absolutePath)) {
            fs.unlinkSync(absolutePath);
          } else if (fs.existsSync(altPath)) {
            fs.unlinkSync(altPath);
          }
        }
      } catch (err) {
        console.error("Error deleting old certificate file:", err);
      }
      await Document.findByIdAndDelete(cert._id);
    }
    
    // Remove old certificates from property.documents array
    const oldCertIds = oldCerts.map(c => c._id.toString());
    property.documents = property.documents.filter(docId => !oldCertIds.includes(docId.toString()));

    // 2. Generate New Certificate
    const verifyUrl = `${process.env.CLIENT_URL || "http://localhost:5500"}/pages/property-details?id=${property._id}`;
    const qrDataUrl = await QRCode.toDataURL(verifyUrl);
    const qrBuffer = Buffer.from(qrDataUrl.split(",")[1], "base64");

    const certId = generateId("CERT");
    const fileName = `${property._id}-certificate-${Date.now()}.pdf`;
    const uploadsDir = path.join(__dirname, "..", "uploads");
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const absolutePath = path.join(uploadsDir, fileName);

    const doc = new PDFDocument({ margin: 40 });
    const writeStream = fs.createWriteStream(absolutePath);
    doc.pipe(writeStream);

    // Watermark/Stamp
    doc.save();
    doc.fontSize(70)
       .fillOpacity(0.15)
       .fillColor('green')
       .text('APPROVED', 130, 300, {
           angle: 45
       });
    doc.restore();

    doc.fontSize(22).fillColor('#12213f').text("Official Land Registry Certificate", { align: "center" });
    doc.moveDown();
    
    doc.fontSize(12).fillColor('black');
    doc.text(`Certificate ID: ${certId}`);
    doc.text(`Property: ${property.title}`);
    doc.text(`Location: ${property.location}`);
    doc.text(`Area: ${property.area} sq units`);
    doc.text(`Valuation: $${property.price}`);
    doc.text(`Owner: ${property.owner.fullName}`);
    
    if (transactionData) {
      doc.moveDown();
      doc.text(`Previous Owner: ${transactionData.previousOwnerName}`);
      doc.text(`Transfer Amount: $${transactionData.amount}`);
    } else {
      doc.moveDown();
      doc.text(`Status: Initially Approved by Government`);
    }

    doc.moveDown();
    doc.text(`Approved On: ${new Date().toLocaleString()}`);
    
    doc.moveDown();
    doc.text("Scan QR for digital verification", { align: "left" });
    doc.image(qrBuffer, { fit: [120, 120] });
    
    doc.end();

    await new Promise((resolve, reject) => {
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
    });

    // Upload to Cloudinary
    let cloudinaryUrl;
    try {
      const result = await cloudinary.uploader.upload(absolutePath, {
        folder: "land_registry_certificates",
        resource_type: "image", // Store PDF as image resource type in Cloudinary
        public_id: `${certId}-${Date.now()}`
      });
      cloudinaryUrl = result.secure_url;
      
      // Clean up local file
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
      }
    } catch (uploadError) {
      console.error("Cloudinary upload error:", uploadError);
      throw new Error("Failed to upload certificate to cloud storage.");
    }

    // 3. Save new Document record
    const savedDocument = await Document.create({
      documentId: certId,
      originalName: "Official_Certificate.pdf",
      filePath: cloudinaryUrl,
      mimeType: "application/pdf",
      size: 0, // Size is stored in Cloudinary, so 0 or result.bytes
      uploadedBy: officerId,
      property: property._id,
      kind: "CERTIFICATE",
    });

    // 4. Attach to property
    property.documents.push(savedDocument._id);
    await property.save();

    return savedDocument;
  } catch (error) {
    console.error("Certificate Generation Error:", error);
    throw error;
  }
};

module.exports = { generateAndAttachCertificate };
