const { PRINTER_TYPES } = require('./constants/printer-types.constants');

// Lazy requires to avoid circular deps at module load time
function createPrinterInstance(printerDoc) {
  switch (printerDoc.printerType) {
    case PRINTER_TYPES.BAMBU_LAB: {
      const { BambuLabPrinter } = require('./create-bambu-lab.service');
      return new BambuLabPrinter(printerDoc);
    }
    case PRINTER_TYPES.OCTOPRINT:
    default: {
      const { OctoPrintPrinter } = require('./create-octoprint.service');
      return new OctoPrintPrinter(printerDoc);
    }
  }
}

module.exports = { createPrinterInstance };
