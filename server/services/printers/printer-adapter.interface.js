/**
 * Abstract base class for printer adapters.
 *
 * Each adapter owns its transport (WebSocket, MQTT, etc.) and maps incoming state
 * to the PrinterStore vocabulary via getPrinterStoreCache() mutators.
 *
 * State shape written to the store (via updatePrinterLiveValue):
 *   tools:    { tool0: { actual, target }, bed: { actual, target }, chamber: { actual, target } }
 *   progress: { completion, printTime, printTimeLeft }
 *   job:      { file: { name, path, display }, estimatedPrintTime }
 *   currentZ: Number
 *
 * Adapters that do not support a method MUST call the no-op below — never throw.
 */
class PrinterAdapter {
  get printerType() {
    throw new Error('PrinterAdapter.printerType not implemented');
  }

  async enablePrinter() {
    throw new Error('PrinterAdapter.enablePrinter not implemented');
  }

  disablePrinter() {
    throw new Error('PrinterAdapter.disablePrinter not implemented');
  }

  async forceReconnect() {
    throw new Error('PrinterAdapter.forceReconnect not implemented');
  }

  killAllConnections() {
    throw new Error('PrinterAdapter.killAllConnections not implemented');
  }

  async refreshState() {
    // optional — adapters that push state via transport need not pull
  }

  async refreshFiles() {
    // optional — return empty list if not supported
    return { fileList: [], folderList: [] };
  }

  ping() {
    // optional — check liveness
  }
}

module.exports = { PrinterAdapter };
