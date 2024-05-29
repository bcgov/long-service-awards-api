/*!
 * PDF processing services
 * File: pdf.services.js
 * Copyright(c) 2024 BC Gov
 * MIT Licensed
 */

const { PDFDocument, StandardFonts } = require("pdf-lib");
const fs = require("fs");
const fontkit = require("@pdf-lib/fontkit");

/**
 * Generates a PDF certificate given the requested document name and matching arguments
 * To utilize this function, first create a PDF using an external tool such as adobe acrobat
 * Add fillable form fields (aka acro form fields) with specific field titles.
 * Provide data for these fillable form fields.
 * fontData is optional, but provides further customization. Default font is Helvetica.
 * Using StandardFonts built in fonts will result in a quicker generation.
 *
 * @param {String} documentName
 * @param {Object} certificateDetails
 * @param {Object} fontData
 * @returns {Object}
 */

async function generatePDFCertificate(
  documentName,
  certificateDetails,
  fontData
) {
  const template_path = `resources/certificate_templates/${documentName}.pdf`;
  // Collection of local fonts to check prior to using built in fonts
  // See https://pdf-lib.js.org/docs/api/enums/standardfonts#docsNav for list of built in fonts
  const localfonts = [
    { name: "BCSans-Regular", path: `resources/fonts/BCSans-Regular.woff` },
    { name: "BCSans-Bold", path: `resources/fonts/BCSans-Bold.woff` },
    {
      name: "CormorantGaramond-Light",
      path: `resources/fonts/CormorantGaramond-Light.ttf`,
    },
  ];

  // Load the PDF template
  const templatePdfBytes = fs.readFileSync(template_path);
  const pdfDoc = await PDFDocument.load(templatePdfBytes);
  pdfDoc.registerFontkit(fontkit);

  const form = pdfDoc.getForm();

  // init array to track fonts used and prevent embedding a font multiple times
  // loop through provided details and match details to form fields, with provided formatting
  // Create a Map object to store embedded fonts
  const fontCache = new Map();

  for (const detail in certificateDetails) {
    const field = form.getTextField(detail);
    if (field) {
      field.setText(certificateDetails[detail]);
      if (fontData && fontData[detail]) {
        const { font, size } = fontData[detail];
        let finalStyle;

        // Check if the font has already been embedded
        if (!fontCache.has(font)) {
          const localFont = localfonts.find((obj) => obj["name"] === font);
          const readFilePromise = localFont
            ? fs.promises.readFile(localFont.path)
            : Promise.resolve();
          finalStyle = await readFilePromise.then((data) => {
            if (localFont) {
              return pdfDoc.embedFont(data);
            } else {
              return pdfDoc.embedFont(StandardFonts[font]);
            }
          });
          fontCache.set(font, finalStyle);
        } else {
          // Retrieve the cached font
          finalStyle = fontCache.get(font);
        }

        field.setFontSize(size);
        field.updateAppearances(finalStyle);
      }
    }
  }

  form.flatten();

  // Save the PDF document to a buffer

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

exports.generatePDFCertificate = generatePDFCertificate;
