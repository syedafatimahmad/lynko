const { PDFDocument } = require('pdf-lib');
const fs = require('fs');

async function run() {
  const existingPdfBytes = fs.readFileSync('c:/lynko/assets/MoldLab_COCAli.pdf');
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const form = pdfDoc.getForm();
  const fields = form.getFields();
  
  if (fields.length > 0) {
    console.log('Form Fields Found:');
    fields.forEach(f => console.log('- ' + f.getName()));
  } else {
    console.log('No form fields found in PDF.');
  }
}
run().catch(console.error);
