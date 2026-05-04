const { Readable } = require("stream");
const fs = require("fs");

const downloadFromOctoPrint = async (url, path, apiKey, deleteTimelapse) => {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": apiKey
    }
  });

  const fileStream = fs.createWriteStream(path);
  const nodeStream = Readable.fromWeb
    ? Readable.fromWeb(res.body)
    : Readable.from(res.body);

  await new Promise((resolve, reject) => {
    nodeStream.pipe(fileStream);
    nodeStream.on("error", reject);
    fileStream.on("close", async () => {
      resolve();
      if (!!deleteTimelapse) {
        deleteTimelapse();
      }
    });
  });
};

const downloadImage = async (url, path, apiKey, callback) => {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "X-Api-Key": apiKey
    }
  });

  const fileStream = fs.createWriteStream(path);
  const nodeStream = Readable.fromWeb
    ? Readable.fromWeb(res.body)
    : Readable.from(res.body);

  await new Promise((resolve, reject) => {
    nodeStream.pipe(fileStream);
    nodeStream.on("error", reject);
    fileStream.on("close", () => {
      resolve();
      if (typeof callback === "function") callback();
    });
  });
};

module.exports = {
  downloadFromOctoPrint,
  downloadImage
};
