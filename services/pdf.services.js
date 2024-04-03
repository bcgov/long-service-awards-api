/*!
 * PDF processing services
 * File: pdf.services.js
 * Copyright(c) 2024 BC Gov
 * MIT Licensed
 */

const { PDFDocument } = require("pdf-lib");
const fs = require("fs");

/**
 * Generates a PDF certificate given the requested document name and matching arguments
 *
 * @param {String} documentName
 * @param {Object} certificateDetails
 * @returns {Object}
 */

async function generatePDFCertificate(documentName, certificateDetails) {
  const template_path = `resources/certificate_templates/${documentName}.pdf`;
  // Load the PDF template
  const templatePdfBytes = fs.readFileSync(template_path);
  const pdfDoc = await PDFDocument.load(templatePdfBytes);
  const form = pdfDoc.getForm();

  for (let detail in certificateDetails) {
    const field = form.getTextField(detail);
    if (field) {
      field.setText(certificateDetails[detail]);
    }
  }

  // Save the PDF document to a buffer
  const pdfBytes = await pdfDoc.save();
  const pdfBase64 = pdfBytes.toString("base64");

  return pdfBase64;
}

exports.generatePDFCertificate = generatePDFCertificate;
