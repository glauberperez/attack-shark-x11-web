# X11 Web Config

Unofficial, open-source web configurator for the **Attack Shark X11** gaming mouse.
It runs entirely in your browser through [WebHID](https://developer.mozilla.org/docs/Web/API/WebHID_API), so it works on **Linux**, Windows and macOS with nothing to install.

**▶ Open it: https://glauberperez.github.io/attack-shark-x11-web/**

> Not affiliated with or endorsed by Attack Shark. Use at your own risk.

## Features

- Polling rate: 125 / 250 / 500 / 1000 Hz
- DPI: up to 8 stages, 50 to 22000 DPI, active stage, per-stage indicator color
- Sensor: angle snapping, ripple control
- Lighting: off, static, breathing, neon, color breathing and DPI-color effects, color, brightness, speed
- Power: sleep and deep-sleep timers, battery level
- Click debounce
- Backup and restore of every setting (JSON file), plus an automatic snapshot on connect
- English and Portuguese interface
- Device log with raw HID traffic for debugging

Every write is confirmed by reading the setting back from the mouse.

Settings are stored in the mouse's onboard memory, so they keep working on any computer and OS.

Tested on real hardware over the 2.4 GHz receiver on Fedora Linux with Chrome. Wired mode has not been tested yet. Button remapping and macros are not implemented.

## Requirements

- A Chromium-based browser: Chrome, Edge, Brave, Opera, Vivaldi… (Firefox and Safari do not support WebHID).
- 2.4 GHz receiver (`1d57:fa60`) or USB cable (`1d57:fa55`). Bluetooth is not supported.

### Linux: one-time permission

By default only root can open HID devices. Run once, then unplug and replug the receiver:

```bash
echo 'KERNEL=="hidraw*", ATTRS{idVendor}=="1d57", ATTRS{idProduct}=="fa60", TAG+="uaccess"
KERNEL=="hidraw*", ATTRS{idVendor}=="1d57", ATTRS{idProduct}=="fa55", TAG+="uaccess"' | sudo tee /etc/udev/rules.d/70-attack-shark-x11.rules
sudo udevadm control --reload-rules && sudo udevadm trigger
```

## How it works

The USB protocol was reverse-engineered by
[HarukaYamamoto0/attack-shark-x11-driver](https://github.com/HarukaYamamoto0/attack-shark-x11-driver) (MIT).
This project reuses that library's packet builders and parsers and replaces its `node-hid` transport with a
WebHID one (`src/device/webhid-transport.ts`), so the same protocol code runs in the browser.

Differences from the library, found while testing on hardware:

- DPI byte 7 is the Y-axis multiplier flag and must mirror byte 6; the library's builder clears it, which halves the
  Y-axis DPI on stages above 12000. This app keeps both flags in sync.
- DPI byte 49 (indicator mode) is preserved from the mouse instead of being reset to a default.
- The command ACK sometimes never arrives, so writes are verified by reading the report back.

The interface is React + TypeScript, built with Vite.

## Development

```bash
npm install
npm run dev
npm run build
```

Every push to `main` is deployed to GitHub Pages by `.github/workflows/pages.yml`.

## Português

Configurador web, não oficial e open source, para o mouse **Attack Shark X11**. Funciona direto no navegador
(Chrome/Edge/Brave) no Linux, Windows e macOS, sem instalar nada. No Linux, rode o comando da seção
*Linux: one-time permission* acima uma vez. As configurações ficam salvas na memória do mouse.

## License

MIT — see [LICENSE](LICENSE).
