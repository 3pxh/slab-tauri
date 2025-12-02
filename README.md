# SLAB!

## [Play](https://slab17.com)
[Play for free online](https://slab17.com) as much as you like, make puzzles, have fun.

## License
Slab 17 by George Hoqqanen is marked CC0 1.0. See [LICENSE](LICENSE) for details.

## About
See [technical teardown](https://www.hoqqanen.com/2025/11/09/slab-technical-teardown/)

## Dev
- `npm run tauri dev` to run the app
- `python iconGenerator.py` will take the icon in public/ and regen app icons
- `tauri ios dev --force-ip-prompt` to run on physical ios device (must `npm run dev` as well to run the frontend server), pick the 192.168 address while on same wifi

## Build
- `npm run tauri ios build -- --export-method app-store-connect`
- open the .xcarchive in xcode to distribute (upload to appstore connect)