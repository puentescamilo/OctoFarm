const { Readable } = require("stream");
const { getPrinterStoreCache } = require("../cache/printer-store.cache");
const Logger = require("../handlers/logger");
const { LOGGER_ROUTE_KEYS } = require("../constants/logger.constants");

const logger = new Logger(LOGGER_ROUTE_KEYS.MIDDLEWARE_OCTOPRINT_PROXY);

module.exports = {
  async proxyOctoPrintClientRequests(req, res) {
    const id = req.paramString("id");
    const item = req.paramString("item");

    const { printerURL, apikey } = getPrinterStoreCache().getPrinter(id);
    const redirectUrl = `${printerURL}/${item}`;

    const isMultipart =
      req.headers["content-type"] && req.headers["content-type"].match(/^multipart\/form-data/);

    const forwardHeaders = { "X-Api-Key": apikey };
    if (!isMultipart) {
      forwardHeaders["Content-Type"] = "application/json";
    }

    let body = undefined;
    if (req.method !== "GET" && req.method !== "HEAD") {
      if (isMultipart || req.readable) {
        body = Readable.toWeb ? Readable.toWeb(req) : req;
      } else {
        body = req.body ? JSON.stringify(req.body) : undefined;
      }
    }

    const params = new URLSearchParams(req.query).toString();
    const targetUrl = params ? `${redirectUrl}?${params}` : redirectUrl;

    let upstream;
    try {
      upstream = await fetch(targetUrl, {
        method: req.method,
        headers: forwardHeaders,
        body,
        redirect: "follow",
        // duplex is required when body is a stream in Node 20+
        ...(body && { duplex: "half" })
      });
    } catch (err) {
      logger.error("Proxy fetch error", err.toString());
      if (!res.headersSent) res.status(502).end();
      return;
    }

    res.status(upstream.status);
    upstream.headers.forEach((value, key) => {
      // Skip headers that must not be forwarded
      if (!["transfer-encoding", "connection"].includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    if (!upstream.body) {
      res.end();
      return;
    }

    const nodeStream = Readable.fromWeb
      ? Readable.fromWeb(upstream.body)
      : Readable.from(upstream.body);

    nodeStream.on("error", () => {
      logger.error("Error pipe broken for octoprint proxy stream");
    });
    nodeStream.on("end", () => {
      logger.info("Pipe ended on octoprint proxy");
    });
    nodeStream.on("close", () => {
      logger.debug("Pipe closed on octoprint proxy");
    });

    nodeStream.pipe(res);
  }
};
