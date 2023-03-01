/*!
 * PDF processing services
 * File: pdf.services.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const PDFDocument = require("pdfkit");
const PDFMerger = require('pdf-merger-js');
const pdfParser = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const schemaServices = require('./schema.services');
const dataPath = process.env.DATA_PATH;
const attachmentCountLimit = 5;

/**
 * Count pages in PDF document
 * @param filePath
 */

const getPageCount = async(filePath) => {
  let dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParser(dataBuffer);
  return data.numrender > data.numpages ? data.numrender : data.numpages;
}

/**
 * @param doc - pdfkit document
 * @param spaceFromEdge - how far the right and left sides should be away from the edge (in px)
 * @param linesAboveAndBelow - how much space should be above and below the HR (in lines)
 */
function addHorizontalRule(doc, spaceFromEdge = 0, linesAboveAndBelow = 0.5) {
  doc.moveDown(linesAboveAndBelow);

  doc.moveTo(spaceFromEdge, doc.y)
    .lineTo(doc.page.width - spaceFromEdge, doc.y)
    .stroke();

  doc.moveDown(linesAboveAndBelow);

  return doc
}

/**
 * @param doc - pdfkit document
 * @param title
 * @param subtitle
 */

function addTitle(doc, title, subtitle) {
  doc.fontSize(24);
  doc.font('Times-Roman').text(title, {paragraphGap: 15});
  doc.fontSize(18);
  doc.font('Helvetica-Bold').text(subtitle, {paragraphGap: 15});
  addHorizontalRule(doc, 0, 1);
  return doc;
}

/**
 * @param doc - pdfkit document
 * @param header
 * @param text
 */

function addItem(doc, header, text) {
  doc.fontSize(14);
  doc.font('Helvetica-Bold').text(header, {paragraphGap: 10});
  doc.fontSize(12);
  doc.font('Helvetica').text(text, {paragraphGap: 15});
  doc.moveDown(1);
  return doc;
}

/**
 * Generate PDF document from JSON data
 *
 * @returns {Object}
 */

const generateNominationPDF = async function(jsonData, callback) {

  // destructure nomination data
  const {
    _id='',
    seq='',
    category='',
    year='',
    organization='',
    title='',
    nominee='',
    nominees='',
    partners=[],
    nominators= [],
    evaluation= {},
    attachments= []
  } = jsonData || {};


  // - use unique sequence number to label file
  // - pad sequence with 00000
  const id = ('00000' + parseInt(seq)).slice(-5);
  const categoryLabel = schemaServices.lookup('categories', category);
  const filename = `submission-${_id}.pdf`;
  const dirPath = path.join(dataPath, 'generated', String(year));
  const submissionFilePath = path.join(dirPath, filename);
  const mergedFilename = `nomination-${id}.pdf`;
  const mergedFilePath = path.join(dirPath, mergedFilename);

  // ensure directory path exists
  fs.mkdir(dirPath, { recursive: true }, (err) => {
    if (err) throw err;
  });

  // create new document
  let doc = new PDFDocument({
    pdfVersion: '1.5',
    lang: 'en-CA',
    tagged: true,
    displayTitle: true,
    margin: 30,
    size: 'A4' });
  doc.info['Title'] = 'Premier\'s Awards Nominations';
  doc.info['Author'] = 'BC Gov (2022)';

  // format PDF content

  // profile data
  addTitle(doc, 'Premier\'s Awards Nomination', `Submission ID ${id}-${year}`);
  addItem(doc, 'Application Category', `${categoryLabel} (${year})`);
  addItem(doc, 'Name of Ministry or eligible organization sponsoring this application', schemaServices.lookup('organizations', organization));

  if (title) {
    addItem(doc, 'Nomination Title', title);
  }

  // Nominee
  if (nominee.hasOwnProperty('firstname') && nominee.firstname && nominee.hasOwnProperty('lastname') && nominee.lastname) {
    doc.fontSize(14);
    doc.font('Helvetica-Bold').text(`Nominee`, {paragraphGap: 15});
    const {firstname = '', lastname = '' } = nominee || {};
    doc.fontSize(12);
    doc.font('Helvetica').text(`${firstname} ${lastname}`, {paragraphGap: 10});
    doc.moveDown(1);
  }

  // Nominees (count)
  if (nominees > 0) {
    addItem(doc, 'Number of Nominees', String(nominees));
  }

  // Partners
  if (partners.length > 0) {
    doc.fontSize(14);
    doc.font('Helvetica-Bold').text(`Partners`, {paragraphGap: 15});
    partners.forEach(partner => {
      const { organization = '' } = partner || {};
      doc.fontSize(12);
      doc.font('Helvetica').text(organization, {paragraphGap: 10});
    });
    doc.moveDown(1);
  }

  // Nominators
  doc.fontSize(14);
  doc.font('Helvetica-Bold').text(`Nominators`, {paragraphGap: 15});
  nominators.forEach(nominator => {
    const {firstname = '', lastname = '', title = '', email='' } = nominator || {};
    doc.fontSize(12);
    doc.font('Helvetica').text(
      `${firstname} ${lastname}${title ? ', ' + title : ''}${email ? ', ' + email : ''}`
      , {paragraphGap: 10}
    );
  });
  doc.moveDown(1);

  // Attachments
  doc.fontSize(14);
  doc.font('Helvetica-Bold').text(`Attachments`, {paragraphGap: 15});
  attachments.forEach(attachment => {
    const {label = '', description=''} = attachment || {};
    const {file = {}} = attachment || {};
    const {originalname='Attachment'} = file || {};
    doc.fontSize(12);
    doc.font('Helvetica').text(
      `${label ? label : originalname}${description ? ': ' + description : ''}`
      , {paragraphGap: 10}
    );
  });
  doc.moveDown(1);

  // Evaluation considerations
  doc.fontSize(16);
  doc.font('Helvetica-Bold').text(`Evaluation Considerations`, {paragraphGap: 15});
  await Promise.all(
    Object.keys(evaluation).map(section => {
      // confirm section is included in category
      if (schemaServices.checkSection(section, category)) {
        addItem(
          doc,
          `${schemaServices.lookup('evaluationSections', section)}`, evaluation[section] || 'n/a');
      }
    })
  );

  // count pages in evaluation portion
  const range = doc.bufferedPageRange();
  console.log('Pages to submission:', range.start + range.count);

  // create file stream and write to file
  const stream = fs.createWriteStream(submissionFilePath);
  doc.pipe(stream);
  doc.end();
  stream.on('error', (err)=>{callback(err)});
  stream.on('close', async ()=>{
    try {
      // merge attachments with main document
      const merger = new PDFMerger();
      // include submission PDF file
      merger.add(submissionFilePath);
      // include file attachments
      console.log('Starting PDF merge...');
      await Promise.all(
        attachments.map(async (attachment) => {
          const {file = {}} = attachment || {};
          const {path = ''} = file || {};
          merger.add(path);
        }));
      console.log('Saving PDF merge...');
      //save under given name and reset the internal document
      await merger.save(mergedFilePath);
      // // check if page count is exceeded
      if (await getPageCount(mergedFilePath) - (range.start + range.count) > attachmentCountLimit) {
        console.log('Page count limit exceeded');
        return null;
      }
      console.log(`Merged PDF file ${mergedFilename} saved.`);
    } catch (err) {
      console.warn(err);
      return null;
    }
  })

  return mergedFilePath;
}
exports.generateNominationPDF = generateNominationPDF;


