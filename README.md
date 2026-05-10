# Workshop Planner

A lightweight browser app for sketching a workshop layout before you move shelves, cabinets, and heavy tools into place.

## Features

- Set the floor plan width and depth in feet.
- Add common workshop items such as shelves, cabinets, workbenches, table saws, drill presses, welders, miter saw stations, and assembly tables.
- Add entry door and garage door markers to show shop openings.
- Use top-down visual drawings for placed items so tools and storage are easier to recognize on the plan.
- Drag items around the SVG floor plan.
- Select an item to rename it, edit its dimensions, adjust its position, rotate it, or delete it.
- Save/load plans locally in the browser.

## Planning doors

Add an **Entry door** or **Garage door** from the item list, drag it to the wall location, then use **Rotate 90 degrees** until it lines up with the correct wall.

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
