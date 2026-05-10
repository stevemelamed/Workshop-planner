(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.WorkshopPlannerCore = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  const MIN_FLOOR_SIZE = 1;
  const MAX_FLOOR_SIZE = 500;
  const MIN_ITEM_SIZE = 0.5;

  const ITEM_TEMPLATES = [
    { key: "shelves", label: "Shelving unit", category: "Storage", width: 4, depth: 1.5 },
    { key: "cabinet", label: "Base cabinet", category: "Storage", width: 3, depth: 2 },
    { key: "workbench", label: "Workbench", category: "Work surface", width: 6, depth: 2.5 },
    { key: "table-saw", label: "Table saw", category: "Large tool", width: 5, depth: 4 },
    { key: "drill-press", label: "Drill press", category: "Large tool", width: 2.5, depth: 2.5 },
    { key: "welder", label: "Welder", category: "Large tool", width: 3, depth: 2 },
    { key: "miter-saw", label: "Miter saw station", category: "Large tool", width: 8, depth: 2.5 },
    { key: "assembly-table", label: "Assembly table", category: "Work surface", width: 4, depth: 4 },
    { key: "entry-door", label: "Entry door", category: "Openings", width: 3, depth: 0.5 },
    { key: "garage-door", label: "Garage door", category: "Openings", width: 9, depth: 0.75 }
  ];

  function toNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function roundFeet(value) {
    return Math.round(toNumber(value, 0) * 100) / 100;
  }

  function clamp(value, min, max) {
    const safeMax = Math.max(min, max);
    return Math.min(Math.max(value, min), safeMax);
  }

  function normalizeRotation(rotation) {
    const turns = Math.round(toNumber(rotation, 0) / 90);
    return ((turns % 4) + 4) % 4 * 90;
  }

  function normalizeFloor(width, depth) {
    return {
      width: clamp(roundFeet(width), MIN_FLOOR_SIZE, MAX_FLOOR_SIZE),
      depth: clamp(roundFeet(depth), MIN_FLOOR_SIZE, MAX_FLOOR_SIZE)
    };
  }

  function getTemplate(key) {
    return ITEM_TEMPLATES.find((template) => template.key === key) || ITEM_TEMPLATES[0];
  }

  function getFootprint(item) {
    const rotation = normalizeRotation(item.rotation);
    const width = Math.max(MIN_ITEM_SIZE, roundFeet(item.width));
    const depth = Math.max(MIN_ITEM_SIZE, roundFeet(item.depth));
    return rotation === 90 || rotation === 270
      ? { width: depth, depth: width }
      : { width, depth };
  }

  function clampItemToFloor(item, floor) {
    const normalizedFloor = normalizeFloor(floor.width, floor.depth);
    const footprint = getFootprint(item);
    return {
      ...item,
      width: Math.max(MIN_ITEM_SIZE, roundFeet(item.width)),
      depth: Math.max(MIN_ITEM_SIZE, roundFeet(item.depth)),
      rotation: normalizeRotation(item.rotation),
      x: roundFeet(clamp(toNumber(item.x, 0), 0, normalizedFloor.width - footprint.width)),
      y: roundFeet(clamp(toNumber(item.y, 0), 0, normalizedFloor.depth - footprint.depth))
    };
  }

  function createPlan(width, depth) {
    return {
      floor: normalizeFloor(width, depth),
      items: []
    };
  }

  function updateFloor(plan, width, depth) {
    const floor = normalizeFloor(width, depth);
    return {
      floor,
      items: plan.items.map((item) => clampItemToFloor(item, floor))
    };
  }

  function createItem(templateKey, floor, index) {
    const template = getTemplate(templateKey);
    const normalizedFloor = normalizeFloor(floor.width, floor.depth);
    const id = `${template.key}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const item = {
      id,
      templateKey: template.key,
      label: template.label,
      category: template.category,
      width: template.width,
      depth: template.depth,
      x: 1 + (index % 4) * 1.5,
      y: 1 + Math.floor(index / 4) * 1.5,
      rotation: 0
    };
    return clampItemToFloor(item, normalizedFloor);
  }

  function resizeItem(item, floor, width, depth) {
    return clampItemToFloor(
      {
        ...item,
        width: Math.max(MIN_ITEM_SIZE, roundFeet(width)),
        depth: Math.max(MIN_ITEM_SIZE, roundFeet(depth))
      },
      floor
    );
  }

  function rotateItem(item, floor) {
    return clampItemToFloor(
      {
        ...item,
        rotation: normalizeRotation(item.rotation + 90)
      },
      floor
    );
  }

  function normalizePlan(value) {
    const floor = normalizeFloor(value && value.floor && value.floor.width, value && value.floor && value.floor.depth);
    const items = Array.isArray(value && value.items)
      ? value.items.map((item) => {
          const template = getTemplate(item.templateKey);
          return clampItemToFloor(
            {
              id: String(item.id || `${template.key}-${Date.now().toString(36)}`),
              templateKey: template.key,
              label: String(item.label || template.label),
              category: String(item.category || template.category),
              width: toNumber(item.width, template.width),
              depth: toNumber(item.depth, template.depth),
              x: toNumber(item.x, 0),
              y: toNumber(item.y, 0),
              rotation: normalizeRotation(item.rotation)
            },
            floor
          );
        })
      : [];
    return { floor, items };
  }

  function parsePlan(raw) {
    if (!raw) {
      return null;
    }
    try {
      return normalizePlan(JSON.parse(raw));
    } catch (error) {
      return null;
    }
  }

  return {
    ITEM_TEMPLATES,
    MIN_ITEM_SIZE,
    clampItemToFloor,
    createItem,
    createPlan,
    getFootprint,
    normalizeFloor,
    normalizePlan,
    parsePlan,
    resizeItem,
    rotateItem,
    updateFloor
  };
});
