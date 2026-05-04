import Validate from "../../utils/validate";
import UI from "../../utils/ui";
import OctoFarmClient from "../../services/octofarm-client.service.js";

let newPrintersIndex = 0;

// REFACTOR clean up this file is a mess jim

const PRINTER_TYPES = { OCTOPRINT: "OCTOPRINT", BAMBU_LAB: "BAMBU_LAB" };

class Printer {
  constructor(printerURL, camURL, apikey, group, name) {
    this.settingsAppearance = {
      color: "default",
      colorTransparent: false,
      defaultLanguage: "_default",
      name,
      showFahrenheitAlso: false,
    };
    this.printerType = PRINTER_TYPES.OCTOPRINT;
    this.printerURL = printerURL;
    this.camURL = camURL;
    this.apikey = apikey;
    this.group = group;
  }
}

class BambuPrinter {
  constructor(ip, serialNumber, accessCode, group, name) {
    this.settingsAppearance = {
      color: "default",
      colorTransparent: false,
      defaultLanguage: "_default",
      name,
      showFahrenheitAlso: false,
    };
    this.printerType = PRINTER_TYPES.BAMBU_LAB;
    this.ip = ip;
    this.serialNumber = serialNumber;
    this.accessCode = accessCode;
    this.group = group;
  }
}

export class PrintersManagement {
  constructor(printerURL, camURL, apikey, group, name) {
    this.printer = new Printer(printerURL, camURL, apikey, group, name);
  }

  static addPrinter(newPrinter) {
    // Insert Blank Row at top of printer list
    if (
      document.getElementById("printerNewTable").classList.contains("d-none")
    ) {
      document.getElementById("printerNewTable").classList.remove("d-none");
    }

    if (typeof newPrinter !== "undefined") {
      document.getElementById("printerNewList").insertAdjacentHTML(
        "beforebegin",
        `
   <tr id="newPrinterCard-${newPrintersIndex}">
        <td><div class="mb-0">
          <input id="newPrinterName-${newPrintersIndex}" type="text" class="form-control" placeholder="Leave blank to grab from OctoPrint" value="${newPrinter.name}">
        </div></td>
        <td><div class="mb-0">
          <input id="newPrinterGroup-${newPrintersIndex}" type="text" class="form-control" placeholder="" value="${newPrinter.group}">
        </div></td>
        <td><div class="mb-0">
          <input id="newPrinterURL-${newPrintersIndex}" type="text" class="form-control" placeholder="" value="${newPrinter.printerURL}">
        </div></td>
        <td><div class="mb-0">
          <input id="newPrinterCamURL-${newPrintersIndex}" type="text" class="form-control" placeholder="Leave blank to grab from OctoPrint" value="${newPrinter.camURL}">
        </div></td>
        <td><div class="mb-0">
          <input id="newPrinterAPIKEY-${newPrintersIndex}" type="text" class="form-control" placeholder="" value="${newPrinter.apikey}">
        </div></td>
        <td><button id="saveButton-${newPrintersIndex}" type="button" class="btn btn-success btn-sm">
                <i class="fas fa-save"></i>
            </button></td>
        <td><button id="delButton-${newPrintersIndex}" type="button" class="btn btn-danger btn-sm">
                <i class="fas fa-trash"></i>
            </button></td>

    </tr>
  `
      );
    } else {
      document.getElementById("printerNewList").insertAdjacentHTML(
        "beforebegin",
        `
        <tr id="newPrinterCard-${newPrintersIndex}">
        <td><div class="mb-0">
          <select id="newPrinterType-${newPrintersIndex}" class="form-control">
            <option value="${PRINTER_TYPES.OCTOPRINT}">OctoPrint</option>
            <option value="${PRINTER_TYPES.BAMBU_LAB}">Bambu Lab</option>
          </select>
        </div></td>
        <td><div class="mb-0">
          <input id="newPrinterName-${newPrintersIndex}" type="text" class="form-control" placeholder="Leave blank to auto-detect">
          <small>Example: <code>My Awesome Printer Name</code></small>
        </div></td>
        <td><div class="mb-0">
          <input id="newPrinterGroup-${newPrintersIndex}" type="text" class="form-control" placeholder="">
          <small>Example: <code>Rack 1</code></small>
        </div></td>
        <td class="op-fields-${newPrintersIndex}"><div class="mb-0">
          <input id="newPrinterURL-${newPrintersIndex}" type="text" class="form-control" placeholder="">
          <small>Example: <code>http://192.168.1.5:80</code></small>
        </div></td>
        <td class="op-fields-${newPrintersIndex}"><div class="mb-0">
          <input id="newPrinterCamURL-${newPrintersIndex}" type="text" class="form-control" placeholder="Leave blank to grab from OctoPrint">
          <small>Example: <code>http://192.168.1.5/webcam/?action=stream</code></small>
        </div></td>
        <td class="op-fields-${newPrintersIndex}"><div class="mb-0">
          <input id="newPrinterAPIKEY-${newPrintersIndex}" type="text" class="form-control" placeholder="">
          <small>OctoPrint Version 1.4.1+: <code>Must use generated User/Application Key</code></small>
        </div></td>
        <td class="bambu-fields-${newPrintersIndex}" style="display:none"><div class="mb-0">
          <input id="newPrinterIP-${newPrintersIndex}" type="text" class="form-control" placeholder="e.g. 192.168.1.20">
          <small>Printer IP address on LAN</small>
        </div></td>
        <td class="bambu-fields-${newPrintersIndex}" style="display:none"><div class="mb-0">
          <input id="newPrinterSerial-${newPrintersIndex}" type="text" class="form-control" placeholder="15-character serial number">
          <small>Found on the printer label</small>
        </div></td>
        <td class="bambu-fields-${newPrintersIndex}" style="display:none"><div class="mb-0">
          <input id="newPrinterAccessCode-${newPrintersIndex}" type="text" class="form-control" placeholder="8-digit code">
          <small>Settings → WLAN on printer screen. Requires <a href="https://wiki.bambulab.com/en/general/bbl-security" target="_blank">Developer Mode</a>.</small>
        </div></td>
        <td><button id="saveButton-${newPrintersIndex}" type="button" class="btn btn-success btn-sm">
                <i class="fas fa-save"></i>
            </button></td>
        <td><button id="delButton-${newPrintersIndex}" type="button" class="btn btn-danger btn-sm">
                <i class="fas fa-trash"></i>
            </button></td>

    </tr>
  `
      );

      // Toggle OctoPrint / Bambu fields when type selector changes
      document
        .getElementById(`newPrinterType-${newPrintersIndex}`)
        .addEventListener("change", (e) => {
          const idx = e.target.id.split("-")[1];
          const isBambu = e.target.value === PRINTER_TYPES.BAMBU_LAB;
          document.querySelectorAll(`.op-fields-${idx}`).forEach((el) => {
            el.style.display = isBambu ? "none" : "";
          });
          document.querySelectorAll(`.bambu-fields-${idx}`).forEach((el) => {
            el.style.display = isBambu ? "" : "none";
          });
        });
    }
    let currentIndex = JSON.parse(JSON.stringify(newPrintersIndex));
    document
      .getElementById(`delButton-${newPrintersIndex}`)
      .addEventListener("click", (event) => {
        UI.removeLine(
          document.getElementById(`newPrinterCard-${currentIndex}`)
        );
        const table = document.getElementById("printerNewTable");
        if (table.rows.length === 1) {
          if (!table.classList.contains("d-none")) {
            table.classList.add("d-none");
          }
        }
      });
    document
      .getElementById(`saveButton-${newPrintersIndex}`)
      .addEventListener("click", async (event) => {
        await PrintersManagement.savePrinter(event.target);
      });
    newPrintersIndex++;
  }

  static async importPrinters() {
    return async function (e) {
      const theBytes = e.target.result; // .split('base64,')[1];
      // Initial JSON validation
      if (Validate.JSON(theBytes)) {
        // If we can parse the file.

        // Grab uploaded file contents into an object
        const importPrinters = JSON.parse(theBytes);
        // Loop over import only importing printers with correct fields.
        for (let newPrinter of importPrinters) {
          const printer = {
            printerURL: "Key not found",
            cameraURL: "Key not found",
            name: "Key not found",
            group: "Key not found",
            apikey: "Key not found",
          };
          if (typeof newPrinter.name !== "undefined") {
            printer.name = newPrinter.name;
          }
          if (typeof newPrinter.printerURL !== "undefined") {
            printer.printerURL = newPrinter.printerURL;
          }
          if (typeof newPrinter.cameraURL !== "undefined") {
            printer.camURL = newPrinter.cameraURL;
          }
          if (typeof newPrinter.group !== "undefined") {
            printer.group = newPrinter.group;
          }
          if (typeof newPrinter.apikey !== "undefined") {
            printer.apikey = newPrinter.apikey;
          }
          await PrintersManagement.addPrinter(printer);
        }
        UI.createAlert(
          "success",
          "Successfully imported your printer list, Please check it over and save when ready.",
          3000
        );
      } else {
        UI.createAlert(
          "error",
          "The file you have tried to upload contains json syntax errors.",
          3000
        );
      }
    };
  }

  static async deletePrinter(deletedPrinters) {
    const deletingAlert = UI.createAlert(
      "warning",
      `Deleting ${[...deletedPrinters]} from the farm...`,
      0
    );
    if (deletedPrinters.length > 0) {
      const printersToRemove = await OctoFarmClient.post("printers/remove", {
        idList: deletedPrinters,
      });
      const { printersRemoved } = printersToRemove;
      deletingAlert.close();
      printersRemoved.forEach((printer) => {
        UI.createAlert(
          "success",
          `Printer: ${printer.printerURL} has successfully been removed from the farm...`,
          1000,
          "Clicked"
        );
        const printerCard = document.getElementById(`printerCard-${printer.printerId}`);
        if(!!printerCard){
         printerCard.remove()
        }
      });
    } else {
      deletingAlert.close();
      UI.createAlert(
        "error",
        "To delete a printer... one must first select a printer.",
        3000,
        "Clicked"
      );
    }
  }

  static async savePrinter(event) {
    let newId = event.id.split("-");
    newId = newId[1];

    const printerTypeEl = document.getElementById(`newPrinterType-${newId}`);
    const printerName = document.getElementById(`newPrinterName-${newId}`);
    const printerGroup = document.getElementById(`newPrinterGroup-${newId}`);
    const printerType = printerTypeEl ? printerTypeEl.value : PRINTER_TYPES.OCTOPRINT;

    const errors = [];

    if (printerName.value.length > 50) {
      errors.push({ type: "warning", msg: "Printer names must be less than 50 characters" });
    }

    let printerPayload;

    if (printerType === PRINTER_TYPES.BAMBU_LAB) {
      const ip = document.getElementById(`newPrinterIP-${newId}`);
      const serial = document.getElementById(`newPrinterSerial-${newId}`);
      const accessCode = document.getElementById(`newPrinterAccessCode-${newId}`);

      if (!ip || ip.value === "") errors.push({ type: "warning", msg: "Please input the Bambu printer IP address" });
      if (!serial || serial.value.length !== 15) errors.push({ type: "warning", msg: "Serial number must be exactly 15 characters" });
      if (!accessCode || accessCode.value.length !== 8) errors.push({ type: "warning", msg: "Access Code must be exactly 8 characters" });

      if (errors.length === 0) {
        printerPayload = new BambuPrinter(
          ip.value,
          serial.value,
          accessCode.value,
          printerGroup.value,
          printerName.value
        );
      }
    } else {
      const printerURL = document.getElementById(`newPrinterURL-${newId}`);
      const printerCamURL = document.getElementById(`newPrinterCamURL-${newId}`);
      const printerAPIKEY = document.getElementById(`newPrinterAPIKEY-${newId}`);

      let printCheck = -1;
      if (printerURL.value !== "") {
        const printerInfo = await OctoFarmClient.listPrinters();
        printCheck = _.findIndex(printerInfo, function (o) {
          return JSON.stringify(o.printerURL) === JSON.stringify(printerURL.value);
        });
      }

      if (printerURL.value === "") errors.push({ type: "warning", msg: "Please input your printers URL" });
      if (printerAPIKEY.value === "") errors.push({ type: "warning", msg: "Please input your printers API Key" });
      if (printCheck > -1) errors.push({ type: "error", msg: `Printer URL: ${printerURL.value} already exists on farm` });

      if (errors.length === 0) {
        printerPayload = new PrintersManagement(
          printerURL.value,
          printerCamURL.value,
          printerAPIKEY.value,
          printerGroup.value,
          printerName.value
        ).build();
      }
    }

    if (errors.length > 0) {
      errors.forEach((error) => {
        UI.createAlert(error.type, error.msg, 3000, "clicked");
      });
    } else {
      const saveButton = document.getElementById(`saveButton-${newId}`);
      saveButton.innerHTML = "<i class=\"fas fa-spinner fa-spin\"></i>";
      saveButton.disabled = true;

      const printersToAdd = await OctoFarmClient.post("printers/add", printerPayload);
      const { printersAdded } = printersToAdd;
      printersAdded.forEach((p) => {
        const label = p.printerURL || p.ip || "Bambu printer";
        UI.createAlert("success", `Printer: ${label} has successfully been added to the farm...`, 500, "Clicked");
      });
      event.parentElement.parentElement.parentElement.remove();
      saveButton.innerHTML = "<i class=\"fas fa-save\"></i>";
      saveButton.disabled = false;
    }
    const table = document.getElementById("printerNewTable");
    if (table.rows.length === 1) {
      if (!table.classList.contains("d-none")) {
        table.classList.add("d-none");
      }
    }
  }

  build() {
    return this.printer;
  }
}
