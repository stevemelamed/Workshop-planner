# Workshop Planner

A lightweight browser app for sketching a workshop layout before you move shelves, cabinets, and heavy tools into place.

## Features

- Set the floor plan width and depth in feet.
- Add common workshop items such as shelves, cabinets, workbenches, table saws, drill presses, welders, miter saw stations, and assembly tables.
- Drag items around the SVG floor plan.
- Select an item to rename it, edit its dimensions, adjust its position, rotate it, or delete it.
- Save/load plans locally in the browser.

## Run locally

Open `index.html` in a browser, or serve the folder with any static file server:

```sh
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## Test

```sh
npm test
```
