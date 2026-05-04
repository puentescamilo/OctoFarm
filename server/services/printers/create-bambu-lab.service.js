const { assign } = require('lodash');
const { PrinterAdapter } = require('./printer-adapter.interface');
const { PRINTER_TYPES } = require('./constants/printer-types.constants');
const { PRINTER_STATES, CATEGORIES } = require('./constants/printer-state.constants');
const { BambuMqttClient } = require('../bambu/bambu-mqtt-client.service');
const { BambuMessageService } = require('../bambu/bambu-message.service');
const { getPrinterStoreCache } = require('../../cache/printer-store.cache');
const PrinterDatabaseService = require('./printer-database.service');
const Logger = require('../../handlers/logger.js');
const { LOGGER_ROUTE_KEYS } = require('../../constants/logger.constants');

const logger = new Logger(LOGGER_ROUTE_KEYS.SERVICE_PRINTER_MANAGER);

class BambuLabPrinter extends PrinterAdapter {
  // Identity
  _id = undefined;
  printerName = undefined;
  sortIndex = undefined;
  order = undefined;
  group = '';
  category = 'Bambu Lab';
  settingsAppearance = undefined;
  dateAdded = new Date().getTime();

  // Bambu-specific connectivity
  ip = undefined;
  serialNumber = undefined;
  accessCode = undefined;

  // Runtime state
  disabled = false;
  enabling = false;
  display = true;
  restartRequired = false;
  versionNotSupported = false;
  versionNotChecked = false;
  activeControlUser = null;

  // OctoFarm state objects (same shape as OctoPrintPrinter for store/dashboard compat)
  printerState = undefined;
  hostState = undefined;
  webSocketState = undefined;

  // Live values written by BambuMessageService
  tools = {};
  progress = { completion: 0, printTime: null, printTimeLeft: null };
  job = null;
  currentJob = null;
  currentZ = 0;
  currentLayer = null;

  // Misc shared fields expected by cleaners/routes
  fileList = { fileList: [], folderList: [], filecount: 0, folderCount: 0 };
  selectedFilament = [];
  costSettings = {};
  tempTriggers = {};
  terminal = [];
  alerts = null;
  currentIdle = 0;
  currentActive = 0;
  currentOffline = 0;
  feedRate = 100;
  flowRate = 100;

  // Private
  #mqtt = null;
  #db = null;

  constructor(printer) {
    super();
    if (!printer?._id || !printer?.ip || !printer?.serialNumber || !printer?.accessCode) {
      throw new Error(
        'BambuLabPrinter: missing required fields: ' +
          JSON.stringify({
            _id: printer?._id,
            ip: printer?.ip,
            serialNumber: printer?.serialNumber,
            accessCode: printer?.accessCode,
          })
      );
    }

    this._id = printer._id.toString();
    this.sortIndex = printer.sortIndex;
    this.order = printer.sortIndex;
    this.ip = printer.ip;
    this.serialNumber = printer.serialNumber;
    this.accessCode = printer.accessCode;
    this.group = printer.group || '';
    this.category = printer.category || 'Bambu Lab';
    this.settingsAppearance = printer.settingsAppearance;
    this.disabled = printer.disabled ?? false;

    if (printer.currentIdle !== undefined) this.currentIdle = printer.currentIdle;
    if (printer.currentActive !== undefined) this.currentActive = printer.currentActive;
    if (printer.currentOffline !== undefined) this.currentOffline = printer.currentOffline;
    if (printer.costSettings) this.costSettings = printer.costSettings;
    if (printer.selectedFilament) this.selectedFilament = printer.selectedFilament;
    if (printer.dateAdded) this.dateAdded = printer.dateAdded;
    if (printer.alerts) this.alerts = printer.alerts;
    if (printer.fileList) this.fileList = printer.fileList;

    this.printerName =
      printer.printerName || printer.settingsAppearance?.name || `Bambu ${this.serialNumber}`;

    this.#db = new PrinterDatabaseService(this._id);
    this.setAllPrinterStates(PRINTER_STATES().SETTING_UP);
  }

  get printerType() {
    return PRINTER_TYPES.BAMBU_LAB;
  }

  // ── State management (mirrors OctoPrintPrinter) ──────────────────────────

  setHostState(state) {
    if (!state?.hostState || !state?.hostStateColour || !state?.hostDescription)
      throw new Error('BambuLabPrinter.setHostState: missing keys ' + JSON.stringify(state));
    this.hostState = {
      state: state.hostState,
      colour: state.hostStateColour,
      desc: state.hostDescription,
    };
  }

  setPrinterState(state) {
    if (!state?.state || !state?.stateColour || !state?.stateDescription)
      throw new Error('BambuLabPrinter.setPrinterState: missing keys ' + JSON.stringify(state));
    this.printerState = {
      state: state.state,
      colour: state.stateColour,
      desc: state.stateDescription,
    };
  }

  setWebsocketState(state) {
    if (!state?.webSocket || !state?.webSocketDescription)
      throw new Error('BambuLabPrinter.setWebsocketState: missing keys ' + JSON.stringify(state));
    this.webSocketState = {
      colour: state.webSocket,
      desc: state.webSocketDescription,
    };
  }

  setAllPrinterStates(state) {
    this.setPrinterState(state);
    this.setHostState(state);
    this.setWebsocketState(state);
  }

  setPrinterToSearching() {
    this.setAllPrinterStates(PRINTER_STATES().SEARCHING);
  }

  updatePrinterLiveValue(object) {
    assign(this, object);
  }

  updateStateTrackingCounters(counter, value) {
    const allowedCounters = [CATEGORIES.IDLE, CATEGORIES.ACTIVE, CATEGORIES.OFFLINE];
    if (!allowedCounters.includes(counter)) return;
    if (Number.isNaN(value)) return;
    this.#db?.update({ ['current' + counter]: value });
  }

  updatePrinterData(data) {
    this.#db?.update(data);
  }

  pushUpdatePrinterDatabase(key, data) {
    this.#db?.pushAndUpdate(this._id, key, data);
  }

  // no-op: Bambu has no filament spool concept in MVP
  clearSelectedSpools() {}

  // no-op: Bambu has no OctoPrint settings to clean up
  cleanPrintersInformation() {}

  deleteFromDataBase() {
    return this.#db?.delete();
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  async enablePrinter() {
    this.enabling = true;
    if (this.disabled) {
      this.#db?.update({ disabled: false });
      this.disabled = false;
    }

    logger.info(`Enabling Bambu Lab printer: ${this.printerName} (${this.ip})`);
    this.setAllPrinterStates(PRINTER_STATES().SEARCHING);

    this.#mqtt = new BambuMqttClient(
      this.ip,
      this.accessCode,
      this.serialNumber,
      this._id,
      (printerId, msg) => BambuMessageService.handleMessage(printerId, msg),
      (printerId, { connected }) => this.#handleConnectionChange(printerId, connected)
    );

    this.#mqtt.open();
    this.enabling = false;
  }

  disablePrinter(force = false) {
    if (!force && !this.disabled) {
      this.#db?.update({ disabled: true });
    }
    this.disabled = true;
    this.enabling = false;
    this.setAllPrinterStates(PRINTER_STATES().DISABLED);
    this.killAllConnections();
  }

  async forceReconnect() {
    if (this.disabled) return "Printer is disabled.";
    this.setAllPrinterStates(PRINTER_STATES().SEARCHING);
    this.killAllConnections();
    this.#mqtt = new BambuMqttClient(
      this.ip,
      this.accessCode,
      this.serialNumber,
      this._id,
      (printerId, msg) => BambuMessageService.handleMessage(printerId, msg),
      (printerId, { connected }) => this.#handleConnectionChange(printerId, connected)
    );
    this.#mqtt.open();
    return 'Reconnecting Bambu MQTT…';
  }

  killAllConnections() {
    if (this.#mqtt) {
      this.#mqtt.close();
      this.#mqtt = null;
    }
    return true;
  }

  // alias used by manager websocketKeepAlive
  reConnectWebsocket() {
    return this.forceReconnect();
  }

  // alias used by manager  (no-op equivalent for Bambu — resetSocketConnection in OP triggers re-enable)
  resetSocketConnection() {
    return this.forceReconnect();
  }

  // ── Interface stubs ───────────────────────────────────────────────────────

  ping() {
    // MQTT lib handles keepalive automatically; nothing to do
  }

  async refreshState() {
    if (this.#mqtt?.connected) {
      this.#mqtt.requestSnapshot();
    }
  }

  async refreshFiles() {
    return { fileList: [], folderList: [] };
  }

  // ── OctoPrint-named stubs (called by store on all printer types) ─────────

  async getSessionkey() { return null; }
  throttleWebSocket() {}
  resetConnectionInformation() {}

  // File ops — no file management in Bambu MVP
  async acquireOctoPrintFilesData() { return { fileList: [], folderList: [] }; }
  async acquireOctoPrintFileData() { return null; }

  // OctoPrint-specific checks — no-op for Bambu
  async acquireOctoPrintUpdatesData() {}
  async acquireOctoPrintPluginsListData() {}
  async acquireOctoPrintPiPluginData() {}
  async acquireOctoPrintLatestSettings() { return this.refreshState(); }
  async acquireOctoPrintStateData() {}
  async acquireOctoPrintSettingsData() {}
  async acquireOctoPrintProfileData() {}
  async updateOctoPrintProfileData() { return null; }
  async updateOctoPrintSettingsData() { return null; }
  async houseKeepFiles() { return []; }

  // ── Private helpers ───────────────────────────────────────────────────────

  #handleConnectionChange(printerId, connected) {
    const store = getPrinterStoreCache();
    if (connected) {
      store.updatePrinterState(printerId, {
        state: 'Operational',
        stateColour: { name: 'secondary', hex: '#888888', category: 'Idle' },
        stateDescription: 'MQTT connected — waiting for data',
      });
      store.updateHostState(printerId, {
        hostState: 'Online',
        hostStateColour: { name: 'success', hex: '#00330e', category: 'Idle' },
        hostDescription: 'Bambu printer reachable',
      });
      store.updateWebsocketState(printerId, {
        webSocket: 'success',
        webSocketDescription: 'MQTT connected',
      });
    } else {
      store.updatePrinterState(printerId, {
        state: 'Offline',
        stateColour: { name: 'danger', hex: '#2e0905', category: 'Offline' },
        stateDescription: 'MQTT disconnected — reconnecting…',
      });
      store.updateHostState(printerId, {
        hostState: 'Shutdown',
        hostStateColour: { name: 'danger', hex: '#2e0905', category: 'Offline' },
        hostDescription: 'Bambu printer unreachable',
      });
      store.updateWebsocketState(printerId, {
        webSocket: 'danger',
        webSocketDescription: 'MQTT offline',
      });
    }
  }
}

module.exports = { BambuLabPrinter };
