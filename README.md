# X11 Web Config

Unofficial, open-source web configurator for the **Attack Shark X11** gaming mouse.
It runs entirely in your browser through [WebHID](https://developer.mozilla.org/docs/Web/API/WebHID_API), so it works on **Linux**, Windows and macOS with nothing to install.

**▶ Open it: https://glauberperez.github.io/attack-shark-x11-web/**

> Not affiliated with or endorsed by Attack Shark. Use at your own risk.

## Features

- Polling rate: 125 / 250 / 500 / 1000 Hz
- DPI: up to 8 stages, 50 to 22000 DPI, active stage, per-stage indicator color, indicator mode (blink / steady / off)
- Sensor: angle snapping, ripple control
- Lighting: off, static, breathing, neon, color breathing and DPI-color effects, color, brightness, speed, with a live preview
- Power: sleep and deep-sleep timers, battery level and charging state
- Click debounce
- Button remapping for all 8 inputs: mouse actions, keyboard keys and shortcuts with Ctrl/Shift/Alt/Win, macros, media, browser and system keys, DPI cycle / + / − / sniper, polling and lighting cycle, LED toggle
- Macro editor with a recorder (keys and mouse buttons), per-step delays, repeat N times / until key press / while held, 8 slots stored in the mouse
- Presets: create, overwrite, rename, apply, import and export full setups
- Backup and restore of every setting, plus an automatic snapshot on connect
- Optional auto-apply, low battery notification, and lighting restore after a DPI button press
- Button tester, firmware version, onboard profile info, factory reset
- Installable as an app (PWA) with offline support
- English and Portuguese interface
- Device log with raw HID traffic

Every write is confirmed by reading the setting back from the mouse. Settings are stored in the mouse's onboard memory, so they keep working on any computer and OS.

Tested on real hardware (firmware 1.09) over the 2.4 GHz receiver and the USB cable on Fedora Linux with Chrome. Macro writing is verified by read-back; playback has not been tested on a button yet.

## Requirements

- A Chromium-based browser: Chrome, Edge, Brave, Opera, Vivaldi… (Firefox and Safari do not support WebHID).
- 2.4 GHz receiver (`1d57:fa60`) or USB cable (`1d57:fa55`, some units `1d57:fa61`). Bluetooth is not supported.

### Linux: one-time permission

By default only root can open HID devices. Run once, then unplug and replug the receiver:

```bash
echo 'KERNEL=="hidraw*", ATTRS{idVendor}=="1d57", ATTRS{idProduct}=="fa60", TAG+="uaccess"
KERNEL=="hidraw*", ATTRS{idVendor}=="1d57", ATTRS{idProduct}=="fa55", TAG+="uaccess"
KERNEL=="hidraw*", ATTRS{idVendor}=="1d57", ATTRS{idProduct}=="fa61", TAG+="uaccess"' | sudo tee /etc/udev/rules.d/70-attack-shark-x11.rules
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
- Button mapping (report `0x08`) reads back in the same slot order it is written on firmware 1.09; no slot permutation and no write-protected mode-key slot were observed.
- Macros (report `0x09`) are acknowledged once, after the third page, not per page. Waiting for an ACK after page 0 and resending it leaves the firmware waiting for the rest of the macro and it rejects every other command until power-cycled.
- WebHID can only read the first 64 bytes of a feature report, so macros are verified by their header and first actions; the full definitions are kept in the browser and in backup files.
- Report `0x10` (bootloader) is blocked in the transport, along with any report id the app does not use.

### Read-only probe of undocumented reports (firmware 1.09, wired)

| Report | Response | Notes |
|---|---|---|
| `0x07` | `07 08 01 01 fe 08 f7 00` | Wake-up mode: two values with their bitwise complement (1 and 8). Meaning not confirmed, not written. |
| `0x0A` | 128 bytes | Full profile dump: DPI block followed by lighting and the rest of the profile. |
| `0x2C` | `2c 04 01 00` | Possibly battery level (another capture reported `0x64`). Reads 0 on cable. |
| `0x22`, `0x24`–`0x2B`, `0x2D`, `0x2E` | all zeros | Likely features of other models sharing the firmware. |

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
