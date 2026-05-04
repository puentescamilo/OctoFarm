const mqtt = require('mqtt');
const Logger = require('../../handlers/logger.js');
const { LOGGER_ROUTE_KEYS } = require('../../constants/logger.constants');

const logger = new Logger(LOGGER_ROUTE_KEYS.SERVICE_TASK_MANAGER); // reuse closest generic key

let _seqId = 0;
function nextSeq() {
  return String(++_seqId);
}

class BambuMqttClient {
  #client = null;
  #ip;
  #accessCode;
  #serialNumber;
  #printerId;
  #onMessage;
  #onStateChange;

  /**
   * @param {string} ip
   * @param {string} accessCode  - 8-digit code shown on the printer display
   * @param {string} serialNumber
   * @param {string} printerId   - OctoFarm Mongo _id, used for store lookups
   * @param {Function} onMessage (printerId, parsedPayload) => void
   * @param {Function} onStateChange (printerId, { connected: bool }) => void
   */
  constructor(ip, accessCode, serialNumber, printerId, onMessage, onStateChange) {
    this.#ip = ip;
    this.#accessCode = accessCode;
    this.#serialNumber = serialNumber;
    this.#printerId = printerId;
    this.#onMessage = onMessage;
    this.#onStateChange = onStateChange;
  }

  get connected() {
    return this.#client?.connected ?? false;
  }

  get reportTopic() {
    return `device/${this.#serialNumber}/report`;
  }

  get requestTopic() {
    return `device/${this.#serialNumber}/request`;
  }

  open() {
    if (this.#client) {
      return;
    }

    // cert is self-signed by the printer — TLS required but cert validation is not possible
    this.#client = mqtt.connect(`mqtts://${this.#ip}:8883`, {
      username: 'bblp',
      password: this.#accessCode,
      rejectUnauthorized: false,
      clientId: `octofarm_${this.#printerId}_${Date.now()}`,
      reconnectPeriod: 5000,
      connectTimeout: 15000,
    });

    this.#client.on('connect', () => {
      logger.info(`Bambu MQTT connected: printer ${this.#printerId} (${this.#ip})`);
      this.#client.subscribe(this.reportTopic, (err) => {
        if (err) {
          logger.error(`Bambu MQTT subscribe failed for ${this.#printerId}: ${err.message}`);
          return;
        }
        // Request a full state dump immediately after subscribe
        this.#publish({ pushing: { sequence_id: nextSeq(), command: 'pushall' } });
      });
      this.#onStateChange(this.#printerId, { connected: true });
    });

    this.#client.on('message', (_topic, payload) => {
      let parsed;
      try {
        parsed = JSON.parse(payload.toString());
      } catch (e) {
        logger.debug(`Bambu MQTT unparseable payload for ${this.#printerId}`);
        return;
      }
      this.#onMessage(this.#printerId, parsed);
    });

    this.#client.on('error', (err) => {
      // mqtt lib logs reconnect attempts itself; we just record the error type
      logger.error(`Bambu MQTT error for ${this.#printerId}: ${err.message}`);
    });

    this.#client.on('close', () => {
      logger.info(`Bambu MQTT disconnected: printer ${this.#printerId}`);
      this.#onStateChange(this.#printerId, { connected: false });
    });
  }

  /**
   * Send a command to the printer.
   * @param {Object} payload - full JSON object, e.g. { print: { command: 'pause', sequence_id: '0' } }
   */
  sendCommand(payload) {
    if (!this.connected) {
      logger.warning(`Bambu MQTT send skipped — not connected (printer ${this.#printerId})`);
      return;
    }
    this.#publish(payload);
  }

  requestSnapshot() {
    this.#publish({ pushing: { sequence_id: nextSeq(), command: 'pushall' } });
  }

  close() {
    if (!this.#client) return;
    this.#client.end(true);
    this.#client = null;
  }

  #publish(payload) {
    this.#client?.publish(this.requestTopic, JSON.stringify(payload), { qos: 1 });
  }
}

module.exports = { BambuMqttClient };
