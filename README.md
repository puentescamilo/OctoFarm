[comment]: <> ([![Latest Release]&#40;https://img.shields.io/github/release/octofarm/octofarm?style=appveyor&#41;]&#40;https://img.shields.io/github/v/tag/octofarm/octofarm?sort=date&#41;)
![Docker Pulls](https://img.shields.io/docker/pulls/octofarm/octofarm?style=appveyor)
[![GitHub stars](https://img.shields.io/github/stars/octofarm/octofarm?style=appveyor)](https://github.com/NotExpectedYet/OctoFarm/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/octofarm/octofarm?style=appveyor)](https://github.com/NotExpectedYet/OctoFarm/network)
[![GitHub license](https://img.shields.io/github/license/octofarm/octofarm?style=appveyor)](https://github.com/NotExpectedYet/octofarm/blob/master/LICENSE.txt)
![GitHub Workflow Status](https://img.shields.io/github/workflow/status/octofarm/octofarm/ci?style=appveyor)
![GitHub issues](https://img.shields.io/github/issues/octofarm/octofarm?color=green&style=appveyor)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg?style=appveyor)](https://GitHub.com/octofarm/octofarm/graphs/commit-activity)
[![Download Dockerhub](https://img.shields.io/badge/DOCKERHUB-OCTOFARM-<COLOR>.svg?style=appveyor)](https://hub.docker.com/r/octofarm/octofarm)

# OctoFarm [![Latest Release](https://img.shields.io/github/release/octofarm/octofarm)](https://img.shields.io/github/v/tag/octofarm/octofarm?sort=date)

<div align="center">
  <a href="https://github.com/NotExpectedYet/OctoFarm">
    <img src="https://github.com/OctoFarm/OctoFarm/blob/master/server/assets/images/logo.png?raw=true" alt="Logo" width="400px">
  </a>

  <p align="center">
    OctoFarm is a single pane of glass that combines multiple 3D printer instances into a single interface. It supports OctoPrint (via REST API and WebSocket) and Bambu Lab printers (via MQTT over LAN) to monitor and manage your 3D printer farm. <br/>
  </p>

  <p align="center">
    A free and open source makers farm management software
    <br />
    <a href="https://docs.octofarm.net"><strong>Explore the documentation</strong></a>
    <br />
    <br />
    ·
    <a href="https://github.com/octofarm/octofarm/issues">Report a bug</a>
    ·
    <a href="https://github.com/OctoFarm/OctoFarm/discussions/new">Request a feature or ask a question</a>
  </p>
</div>

- [About OctoFarm](#about-octofarm)
- [Need help?](#need-help)
- [Getting Started](#getting-started)
- [Installation Production](#installation-production)
- [Installation Development](#installation-development)
- [License](#license)
- [Contact](#contact)
- [Acknowledgements](#acknowledgements)

## About OctoFarm

![OctoFarm Dashboard][DashboardScreenshot]

OctoFarm was built to fill a need that anyone with multiple 3D printers will have run into. How do I manage multiple printers from one place? That's where OctoFarm steps in — add your printers to the system and it will keep you up to date on the status of your entire farm.

Built by a maker, for makers to get more out of their printer farms.

- **OctoPrint**: manage instances right down to triggering updates and plugin installs.
- **Bambu Lab** *(MVP)*: connect to X1C, P1S, P1P, A1 and A1 Mini via MQTT over LAN — live temperatures, print progress, layer tracking and pause/resume/stop controls. Requires [Developer Mode](https://wiki.bambulab.com/en/general/bbl-security) enabled on the printer.
- Keep track of all live data on your farm with a selection of views.
- Manage your OctoPrint file system.
- Get an overview of your farm with the customisable dashboard.
- Manage and track filament on your farm.
- Track history and logs for all of your instances.
- Supports a wide variety of OctoPrint plugins to augment the OctoFarm system with more information.

## Need help?

Feel free to join any of the OctoFarm communities or follow OctoFarms progress on it's blog.

- [OctoFarms Website](https://octofarm.net/) - Having issues...
- [OctoFarms Documentation](https://docs.octofarm.net/)
- [OctoFarm Blog](https://octofarm.net/blog/) - Having issues...
- [Community Support on Facebook](https://www.facebook.com/groups/octofarm/)
- [Community Support on Discord](https://discord.gg/vjabMUn/)
- [General Question or Feature Request?](https://github.com/OctoFarm/OctoFarm/discussionss/)
- [Fancy donating to the project?](https://octofarm.net/sponsorship/)

## Getting Started

Before installing, it is best to read the getting started documents here:
[Getting Started](https://docs.octofarm.net/getting-started/)

## Installation Production
Check out the OctoFarm documentation website for installation instructions on various platforms
[Getting Started](https://docs.octofarm.net/installation/)

## Installation Development
### Requirements
- Git
- NodeJS >= v20
- npm

1. Clone OctoFarm

```sh
git clone https://github.com/puentescamilo/OctoFarm.git
```

2. Install mono-repo dev tooling (eslint, prettier, nodemon)

```sh
npm install
```

3. Install server and client dependencies

```sh
npm run setup-dev
```

4. Create an `.env` file in the root directory (`OctoFarm/.env`):

```dotenv
NODE_ENV=development
MONGO=mongodb://127.0.0.1:27017/octofarm
OCTOFARM_PORT=4000
```

5. Build the client

```sh
npm run build-client
```

6. (Optional) Watch for client changes in a secondary terminal:

```sh
npm run dev-client
```

7. Start the server

```sh
npm run dev-server
```

The dev server uses nodemon for live reloading and outputs all logs to the console.

### Adding a Bambu Lab printer

OctoFarm can connect to Bambu Lab printers over your local network without going through Bambu's cloud. Before adding one:

1. On the printer: **Settings → General → Developer Mode → Enable**.
2. Note the printer's **IP address**, **Serial Number** (15 chars, on the label) and **Access Code** (8 digits, Settings → WLAN).
3. In OctoFarm, open **Printer Management → Add Printer**, select **Bambu Lab** as the printer type, and fill in those three values.

> **Firmware note:** the Developer Mode requirement was introduced in the January 2025 firmware update (X1 ≥ 01.08.03, equivalent versions for P1/A1 series). Printers on older firmware do not need Developer Mode but may have limited LAN API support.

**Current MVP capabilities:** live temperatures, print progress, layer counter, job name, HMS error codes, and pause/resume/stop controls. File upload, AMS status and camera feed are planned for a future release.

## Contributing

I don't mind taking contributions to the code. Just be warned OctoFarm is an ever evolving environment due to how it was originally a learning project for myself and JavaScript. 

It's a great repository if anyone would like to practice their code clean-up and refactoring skills. 

Currently I'm planning to fix this with V2.0 but that is held on a private repository. 

If you'd like to contribute something, then please take a look at the open project on this repository, or feel free to open a discussion with your plans. 

## License

This work [is licensed](https://github.com/OctoFarm/OctoFarm/blob/master/LICENSE.txt) under the [GNU Affero General Public License v3](https://www.gnu.org/licenses/agpl-3.0.html).

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.

## Contact

You can contact me at [info@notexpectedyet.com](mailto:info@notexpectedyet.com)

## Acknowledgements

- [My Patreons](https://www.patreon.com/NotExpectedYet) - You all keep me going and afford me a financial incentive to keep OctoFarm up to date with new features and fixes! Biggest thanks of all.
- [Gina Häußge](https://octoprint.org/) - Without OctoPrint none of this would be possible. Massive thanks to the work
  of Gina and everyone who helps out with that.
- [JetBrains IDE](https://www.jetbrains.com/webstorm/) - Thanks to JebBrains for allowing a free license to use with
  developing my application. Their IDE is top notch!

[DashboardScreenshot]: https://github.com/NotExpectedYet/OctoFarm/blob/master/screenshots/dashboard.png?raw=true
