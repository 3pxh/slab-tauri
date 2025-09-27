# SLAB!

## Dev
- `npm run tauri dev` to run the app
- `python iconGenerator.py` will take the icon in public/ and regen app icons
- `tauri ios dev --force-ip-prompt` to run on physical ios device (must `npm run dev` as well to run the frontend server), pick the 192.168 address while on same wifi

## Level Prompt

Write a block of javascript which could evaluate a Slab--it will get passed as a string to a new Function() binding slab, as we expect in the evaluation in @SlabPuzzle.tsx --

(Just reply in the chat, we don't need to edit the README)

It should return true if...

## TODO

- local persistent storage via sqlite (or possibly localstorage on web? make an adapter for both?); persist all the slabs created for various levels, plus guess attempts / win status
- when creating a level show all the slabs created so far and allow adding them as examples
- get unique device id https://github.com/SkipperNDT/tauri-plugin-machine-uid/blob/main/README.md and then allow creation of puzzles from the community -- gets stored with their device id and if giving the device id you can access your own; if you share it, you share via the uuid (maybe deeplinked) and if you know the uuid then you can load a puzzle (lock down the DB to not be viewable by unauthenticated users; all of this must be done through functions)
