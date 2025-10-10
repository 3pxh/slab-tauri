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
- get unique device id https://github.com/SkipperNDT/tauri-plugin-machine-uid/blob/main/README.md and then allow creation of puzzles from the community -- gets stored with their device id and if giving the device id you can access your own; if you share it, you share via the uuid (maybe deeplinked) and if you know the uuid then you can load a puzzle (lock down the DB to not be viewable by unauthenticated users; all of this must be done through functions)
- include a description of the rule which gets shown after all guesses are done (also we should check new rules against all the other ones with an LLM so we don't repeat rules!); also include the prompt that was used to generate a rule, so that we could generate the same rule if the slab type changes!
- versioning of app / slab constructs so that as we change the definition we can produce new puzzles which aren't backward compat (or perhaps we need to define migrations)
- after all guesses are done, include a "generate new +/- example" which pulls from the big slab library and finds one with the desired evaluation?
- produce an explainer video which is an onboarding for people? (real pain in the butt to repro as the visual design changes; use playwright to generate the recorded video at a cadence that fits a fixed prerecorded voiceover!)