const assert = require("node:assert/strict");
const core = require("../planner-core");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

test("creates a bounded floor plan", () => {
  assert.deepEqual(core.createPlan(24, 20), {
    floor: { width: 24, depth: 20 },
    items: []
  });
  assert.deepEqual(core.createPlan(-4, 999).floor, {
    width: 1,
    depth: 500
  });
});

test("adds known workshop items with default dimensions", () => {
  const item = core.createItem("table-saw", { width: 24, depth: 20 }, 0);
  assert.equal(item.label, "Table saw");
  assert.equal(item.width, 5);
  assert.equal(item.depth, 4);
  assert.equal(item.x, 1);
  assert.equal(item.y, 1);
});

test("keeps items inside the floor after moving or resizing", () => {
  const floor = { width: 10, depth: 8 };
  const clamped = core.clampItemToFloor(
    {
      id: "bench",
      templateKey: "workbench",
      label: "Bench",
      category: "Work surface",
      width: 4,
      depth: 3,
      x: 99,
      y: -4,
      rotation: 0
    },
    floor
  );
  assert.equal(clamped.x, 6);
  assert.equal(clamped.y, 0);

  const resized = core.resizeItem(clamped, floor, 12, 12);
  assert.equal(resized.width, 12);
  assert.equal(resized.depth, 12);
  assert.equal(resized.x, 0);
  assert.equal(resized.y, 0);
});

test("rotates item footprint and clamps position", () => {
  const floor = { width: 6, depth: 6 };
  const rotated = core.rotateItem(
    {
      id: "miter",
      templateKey: "miter-saw",
      label: "Miter saw station",
      category: "Large tool",
      width: 5,
      depth: 2,
      x: 3,
      y: 3,
      rotation: 0
    },
    floor
  );
  assert.equal(rotated.rotation, 90);
  assert.deepEqual(core.getFootprint(rotated), { width: 2, depth: 5 });
  assert.equal(rotated.x, 3);
  assert.equal(rotated.y, 1);
});

test("parses saved plans defensively", () => {
  assert.equal(core.parsePlan("{"), null);
  const parsed = core.parsePlan(
    JSON.stringify({
      floor: { width: 18, depth: 16 },
      items: [{ templateKey: "welder", label: "Welder", width: 3, depth: 2, x: 17, y: 15 }]
    })
  );
  assert.equal(parsed.floor.width, 18);
  assert.equal(parsed.items[0].label, "Welder");
  assert.equal(parsed.items[0].x, 15);
  assert.equal(parsed.items[0].y, 14);
});
