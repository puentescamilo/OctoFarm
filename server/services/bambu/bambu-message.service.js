const { getPrinterStoreCache } = require('../../cache/printer-store.cache');
const { mapStateToCategory } = require('../printers/utils/printer-state.utils');
const Logger = require('../../handlers/logger.js');
const { LOGGER_ROUTE_KEYS } = require('../../constants/logger.constants');

const logger = new Logger(LOGGER_ROUTE_KEYS.SERVICE_TASK_MANAGER);

// Bambu gcode_state → OctoFarm state string (must match mapStateToCategory keys)
const GCODE_STATE_MAP = {
  IDLE: 'Operational',
  PREPARE: 'Printing', // heating/bed-levelling — printer is busy
  RUNNING: 'Printing',
  PAUSE: 'Paused',
  FINISH: 'Operational',
  FAILED: 'Error!', // Note: OctoFarm uses "Error!" with an exclamation mark
};

function mapGcodeState(gcodeState) {
  return GCODE_STATE_MAP[gcodeState] ?? 'Printing';
}

function buildToolsPayload(print) {
  const tools = {};

  if (print.nozzle_temper !== undefined) {
    tools.tool0 = {
      actual: print.nozzle_temper,
      target: print.nozzle_target_temper ?? 0,
    };
  }
  if (print.bed_temper !== undefined) {
    tools.bed = {
      actual: print.bed_temper,
      target: print.bed_target_temper ?? 0,
    };
  }
  // chamber_temper is always present (0 on models without chamber heating)
  if (print.chamber_temper !== undefined) {
    tools.chamber = { actual: print.chamber_temper, target: 0 };
  }

  return tools;
}

function buildProgressPayload(print) {
  const completion = print.mc_percent ?? 0;
  const printTimeLeft = (print.mc_remaining_time ?? 0) * 60; // minutes → seconds

  // Bambu does not report elapsed time; derive from completion + remaining
  let printTime;
  if (completion > 0 && completion < 100) {
    const totalSeconds = printTimeLeft / ((100 - completion) / 100);
    printTime = Math.round(totalSeconds - printTimeLeft);
  } else {
    printTime = null;
  }

  return { completion, printTimeLeft, printTime };
}

class BambuMessageService {
  static handleMessage(printerId, msg) {
    try {
      if (msg.print) {
        BambuMessageService.#handlePrintPayload(printerId, msg.print);
      }
      // mc_print / info / system payloads are not handled in MVP
    } catch (e) {
      logger.error(`BambuMessageService error for ${printerId}: ${e.message}`);
    }
  }

  static #handlePrintPayload(printerId, print) {
    const store = getPrinterStoreCache();

    // Printer state — must match setPrinterState({ state, stateColour, stateDescription })
    if (print.gcode_state) {
      const state = mapGcodeState(print.gcode_state);
      store.updatePrinterState(printerId, {
        state,
        stateColour: mapStateToCategory(state),
        stateDescription: `Bambu: ${print.gcode_state}`,
      });
    }

    // Temperatures
    const tools = buildToolsPayload(print);
    if (Object.keys(tools).length > 0) {
      store.updatePrinterLiveValue(printerId, { tools });
    }

    // Progress
    if (print.mc_percent !== undefined) {
      store.updatePrinterLiveValue(printerId, { progress: buildProgressPayload(print) });
    }

    // Job name
    if (print.subtask_name || print.gcode_file) {
      const name = print.subtask_name || print.gcode_file || '';
      store.updatePrinterLiveValue(printerId, {
        job: { file: { name, path: name, display: name } },
      });
    }

    // Layer tracking — reuse currentZ for layer number (visible in dashboard)
    if (print.layer_num !== undefined) {
      store.updatePrinterLiveValue(printerId, {
        currentZ: print.layer_num,
        currentLayer: { current: print.layer_num, total: print.total_layer_num ?? 0 },
      });
    }

    // HMS error codes — append to terminal
    if (Array.isArray(print.hms) && print.hms.length > 0) {
      const line = print.hms
        .map((h) => `[HMS] attr:${h.attr} code:${h.code} severity:${h.severity ?? '?'}`)
        .join('\n');
      store.pushTerminalData(printerId, line);
    }
  }
}

module.exports = { BambuMessageService };
