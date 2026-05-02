# Agent Pixels

![Agent Pixels logo banner](public/assets/brand/agent-pixels-logo-banner.jpg)

Agent Pixels is a Paperclip plugin that turns your company of AI agents into a live pixel-art office camera.

Learn more at [agent-pixels.com](https://agent-pixels.com).

![Agent Pixels hero image](public/assets/brand/agent-pixels-hero.jpg)

## What It Does

- Shows Paperclip agents walking around a multi-room pixel office.
- Moves working agents toward desks and idle agents toward lounge, kitchen, boardroom, and games areas.
- Supports multiple camera views across the office layout.
- Includes assignable character sprites so each agent can have a consistent look.
- Expands the original pixel-agent style into a denser company view for larger Paperclip teams.

## Screenshots

![Agent Pixels camera screenshot](public/assets/brand/agent-pixels-screenshot-camera.jpg)

![Agent Pixels character picker screenshot](public/assets/brand/agent-pixels-screenshot-characters.jpg)

## Install

### Prerequisites

- Node.js
- pnpm
- Paperclip running

Paperclip must be running before installing or testing the plugin. The plugin needs the Paperclip host to load the worker, serve the UI bundle, and expose the plugin bridge.

If you installed Paperclip from npm and do not have the Paperclip source code locally, use a prebuilt Agent Pixels release when available. Building from source currently requires the Paperclip repo because the plugin SDK is not published separately.

Clone and build Agent Pixels:

```bash
git clone https://github.com/gcampton/Agent-Pixels
cd Agent-Pixels
pnpm install
pnpm run build
```

The build output is written to `dist/`.

If your Paperclip source is somewhere else, set the SDK path when building. This path should point to the built Paperclip plugin SDK:

```bash
PAPERCLIP_SDK_DIST=/path/to/paperclip/packages/plugins/sdk/dist pnpm run build
```

Then install the plugin in Paperclip using the local path to this repo.

## Development

Run checks before opening a pull request:

```bash
pnpm run typecheck
pnpm run build
```

### Self-Hosted Docker Install

For self-hosted Paperclip, clone Agent Pixels into a folder that is visible inside the Paperclip container. The install API must receive the container path, not the host path.

Example host path:

```bash
git clone https://github.com/gcampton/Agent-Pixels /volume4/docker/paperclip/plugins/agent-pixels
```

Example container path:

```text
/paperclip/plugins/agent-pixels
```

Agent Pixels currently builds against the Paperclip plugin SDK from the Paperclip monorepo. Build `@paperclipai/shared` and `@paperclipai/plugin-sdk` from the Paperclip source first:

```bash
cd /path/to/paperclip/packages/shared
npm install
npx tsc --noEmitOnError false

cd /path/to/paperclip/packages/plugins/sdk
npm install
npx tsc --noEmitOnError false
```

Then build Agent Pixels. If the plugin is not cloned under the Paperclip repo, set `PAPERCLIP_SDK_DIST`:

```bash
cd /path/to/Agent-Pixels
npm install
PAPERCLIP_SDK_DIST=/path/to/paperclip/packages/plugins/sdk/dist npm run build
```

In authenticated Paperclip deployments, create a CLI auth challenge and approve it as an instance admin:

```bash
curl -s -X POST http://<your-paperclip-host>/api/cli-auth/challenges \
  -H "Content-Type: application/json" \
  -d '{"requestedAccess":"instance_admin_required","command":"plugin install"}'
```

Open the returned `approvalUrl`, approve the request, then install using the returned `boardApiToken`:

```bash
curl -s -X POST http://<your-paperclip-host>/api/plugins/install \
  -H "Authorization: Bearer <boardApiToken>" \
  -H "Content-Type: application/json" \
  -d '{"packageName":"/paperclip/plugins/agent-pixels","isLocalPath":true}'
```

## Assets

Character sprites live in:

```text
public/assets/characters/
```

Add new sprites as `char_81.png`, `char_82.png`, etc. The build script auto-detects `char_*.png` files and adds them to the plugin asset index.

### Asset Dimensions

Agent Pixels uses a 16px tile grid.

| Asset type | Location | Size |
| --- | --- | --- |
| Character sprite sheet | `public/assets/characters/char_*.png` | `112x96` PNG |
| Character frame | inside each character sheet | `16x32` |
| Character sheet layout | inside each character sheet | `7` columns x `3` rows |
| Floor tile | `public/assets/floors/floor_*.png` | `16x16` |
| Wall tile sheet | `public/assets/walls/wall_0.png` | `64x128` |
| Furniture sprites | `public/assets/furniture/**` | Multiples of `16px` |
| Office layout | `public/assets/default-layout-1.json` | `21x22` tiles (`336x352px`) |
| Boardroom/kitchen layout | `public/assets/agent-pixels-layout-boardroom-kitchen.json` | `22x15` tiles (`352x240px`) |
| Combined camera map | generated in the UI | `68x22` tiles (`1088x352px`) |

Character sheets use three direction rows: front, back, and side. The opposite side direction is mirrored by the renderer.

Common furniture sizes currently in use:

| Asset | Size |
| --- | --- |
| Desk front | `48x32` |
| Desk side | `16x64` |
| PC sprites | `16x32` |
| Wooden/cushioned chairs | `16x32` or `16x16` |
| Sofa front/back | `32x16` |
| Sofa side | `16x32` |
| Boardroom table | `48x80` |
| Pool table | `80x48` |
| Arcade machine | `32x48` |
| Paintings/whiteboard | `16x32` or `32x32` |
| Plants | `16x32` or `32x48` |

## Ready-Made Paperclip Companies

Agent Pixels is free to use. It is also designed to work nicely with ready-made Paperclip company packs that will be available through [agent-pixels.com](https://agent-pixels.com).

Planned company packs include:

- SEO agency
- Game dev agency
- SaaS company
- Full company

More company types are being explored. These packs are intended for people who want a ready-to-run Paperclip company with agents, roles, workflows, and a visual office already set up.

## Support

For feature requests, bugs, or help using Agent Pixels, visit [agent-pixels.com/support](https://www.agent-pixels.com/support).

## What's Next

Planned improvements include:

- More character models and customization options.
- More visual assets, props, and office interactions.
- Adjustable office scale, including desks, meeting rooms, lounges, and floors.
- Additional layouts such as co-working spaces, agency lofts, and high-rise offices.
- Better idle behaviors and animations, including talking, pacing, and coffee runs.

## Contributing

Pull requests are welcome for bug fixes, plugin improvements, new room assets, furniture, and character sprites.

For commercial enquiries, ready-made Paperclip company packs, or larger collaboration ideas, start at [agent-pixels.com](https://agent-pixels.com).
