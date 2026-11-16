# X11 Web Config

Unofficial, open-source web configurator for the **Attack Shark X11** gaming mouse.
It runs entirely in your browser through [WebHID](https://developer.mozilla.org/docs/Web/API/WebHID_API), so it works on **Linux**, Windows and macOS with nothing to install.

**▶ Open it: https://glauberperez.github.io/attack-shark-x11-web/**

> Not affiliated with or endorsed by Attack Shark. Use at your own risk.

## Features

| Setting | Status |
|---|---|
| Polling rate (125 / 250 / 500 / 1000 Hz) | ✅ tested on hardware |
| DPI stages (values, enabled stages, active stage, colors) | ✅ read verified, write via library |
| Motion sync, angle snapping, ripple control, lift-off distance | ✅ read verified, write via library |
| Lighting mode, color, speed, brightness | ✅ read verified, write via library |
| Sleep / deep-sleep timers, debounce | ✅ read verified, write via library |
| Battery level | ✅ when the mouse reports it |
| Backup and restore of all settings (JSON file) | ✅ |
| Button remapping and macros | ⏳ not yet |

Settings are saved to the mouse's onboard memory, so they keep working on every computer and OS.

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
WebHID one (`src/webhid-transport.ts`), so the same protocol code runs in the browser.

## Development

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # static site in dist/
```

Every push to `main` is deployed to GitHub Pages by `.github/workflows/pages.yml`.

## Português

Configurador web, não oficial e open source, para o mouse **Attack Shark X11**. Funciona direto no navegador
(Chrome/Edge/Brave) no Linux, Windows e macOS, sem instalar nada. No Linux, rode o comando da seção
*Linux: one-time permission* acima uma vez. As configurações ficam salvas na memória do mouse.

## License

MIT — see [LICENSE](LICENSE).
