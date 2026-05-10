const core = window.WorkshopPlannerCore;
const STORAGE_KEY = "workshop-planner-plan";
const SVG_NS = "http://www.w3.org/2000/svg";

const toolbox = document.querySelector("#toolbox");
const floorForm = document.querySelector("#floor-form");
const floorWidthInput = document.querySelector("#floor-width");
const floorDepthInput = document.querySelector("#floor-depth");
const planSummary = document.querySelector("#plan-summary");
const svg = document.querySelector("#floor-plan");
const itemForm = document.querySelector("#item-form");
const selectionHelp = document.querySelector("#selection-help");
const itemLabelInput = document.querySelector("#item-label");
const itemWidthInput = document.querySelector("#item-width");
const itemDepthInput = document.querySelector("#item-depth");
const itemXInput = document.querySelector("#item-x");
const itemYInput = document.querySelector("#item-y");
const rotateButton = document.querySelector("#rotate-item");
const deleteButton = document.querySelector("#delete-item");
const saveButton = document.querySelector("#save-plan");
const loadButton = document.querySelector("#load-plan");
const clearButton = document.querySelector("#clear-plan");

let plan = core.parsePlan(localStorage.getItem(STORAGE_KEY)) || core.createPlan(24, 20);
let selectedId = plan.items[0] ? plan.items[0].id : null;
let dragState = null;

function svgElement(tag, attrs = {}) {
  const element = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
  return element;
}

function selectedItem() {
  return plan.items.find((item) => item.id === selectedId) || null;
}

function setPlan(nextPlan) {
  plan = core.normalizePlan(nextPlan);
  if (!selectedItem()) {
    selectedId = plan.items[0] ? plan.items[0].id : null;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
  render();
}

function updateItem(id, updater) {
  setPlan({
    ...plan,
    items: plan.items.map((item) => {
      if (item.id !== id) {
        return item;
      }
      return core.clampItemToFloor(updater(item), plan.floor);
    })
  });
}

function flashButton(button, text) {
  const original = button.textContent;
  button.textContent = text;
  window.setTimeout(() => {
    button.textContent = original;
  }, 1100);
}

function renderToolbox() {
  toolbox.replaceChildren(
    ...core.ITEM_TEMPLATES.map((template) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "tool-card";
      button.innerHTML = `
        <span>
          <strong>${template.label}</strong>
          <span class="tool-meta">${template.category}</span>
        </span>
        <span class="tool-meta">${template.width} x ${template.depth} ft</span>
      `;
      button.addEventListener("click", () => {
        const item = core.createItem(template.key, plan.floor, plan.items.length);
        selectedId = item.id;
        setPlan({ ...plan, items: [...plan.items, item] });
      });
      return button;
    })
  );
}

function renderControls() {
  floorWidthInput.value = plan.floor.width;
  floorDepthInput.value = plan.floor.depth;
  planSummary.textContent = `${plan.floor.width} ft x ${plan.floor.depth} ft, ${plan.items.length} item${plan.items.length === 1 ? "" : "s"}`;

  const item = selectedItem();
  itemForm.hidden = !item;
  selectionHelp.hidden = Boolean(item);
  if (!item) {
    return;
  }

  itemLabelInput.value = item.label;
  itemWidthInput.value = item.width;
  itemDepthInput.value = item.depth;
  itemXInput.value = item.x;
  itemYInput.value = item.y;
}

function renderGrid() {
  const group = svgElement("g", { "aria-hidden": "true" });
  for (let x = 0; x <= plan.floor.width; x += 1) {
    group.appendChild(
      svgElement("line", {
        class: `grid-line${x % 5 === 0 ? " major" : ""}`,
        x1: x,
        y1: 0,
        x2: x,
        y2: plan.floor.depth
      })
    );
  }
  for (let y = 0; y <= plan.floor.depth; y += 1) {
    group.appendChild(
      svgElement("line", {
        class: `grid-line${y % 5 === 0 ? " major" : ""}`,
        x1: 0,
        y1: y,
        x2: plan.floor.width,
        y2: y
      })
    );
  }
  return group;
}

function appendDetail(group, tag, className, attrs) {
  const detail = svgElement(tag, { class: `item-detail ${className}`, ...attrs });
  group.appendChild(detail);
  return detail;
}

function renderShelves(group, width, depth) {
  for (let index = 1; index < 4; index += 1) {
    appendDetail(group, "line", "shelf-line", {
      x1: 0.18,
      y1: (depth * index) / 4,
      x2: width - 0.18,
      y2: (depth * index) / 4
    });
  }
  for (let index = 0; index < 3; index += 1) {
    appendDetail(group, "rect", "storage-bin", {
      x: 0.28 + index * (width / 3),
      y: depth * 0.18,
      width: Math.max(0.25, width / 5),
      height: Math.max(0.18, depth * 0.22),
      rx: 0.08
    });
  }
}

function renderCabinet(group, width, depth) {
  appendDetail(group, "line", "cabinet-top", {
    x1: 0.2,
    y1: depth * 0.24,
    x2: width - 0.2,
    y2: depth * 0.24
  });
  appendDetail(group, "line", "cabinet-split", {
    x1: width / 2,
    y1: depth * 0.24,
    x2: width / 2,
    y2: depth - 0.18
  });
  appendDetail(group, "line", "cabinet-handle", {
    x1: width * 0.28,
    y1: depth * 0.58,
    x2: width * 0.38,
    y2: depth * 0.58
  });
  appendDetail(group, "line", "cabinet-handle", {
    x1: width * 0.62,
    y1: depth * 0.58,
    x2: width * 0.72,
    y2: depth * 0.58
  });
}

function renderWorkbench(group, width, depth) {
  appendDetail(group, "rect", "bench-top", {
    x: width * 0.08,
    y: depth * 0.13,
    width: width * 0.84,
    height: depth * 0.74,
    rx: 0.12
  });
  [
    [width * 0.18, depth * 0.25],
    [width * 0.82, depth * 0.25],
    [width * 0.18, depth * 0.75],
    [width * 0.82, depth * 0.75]
  ].forEach(([cx, cy]) => {
    appendDetail(group, "circle", "bench-leg", { cx, cy, r: Math.max(0.06, Math.min(width, depth) * 0.04) });
  });
  appendDetail(group, "rect", "bench-vise", {
    x: width * 0.82,
    y: depth * 0.38,
    width: width * 0.12,
    height: depth * 0.24,
    rx: 0.05
  });
}

function renderTableSaw(group, width, depth) {
  appendDetail(group, "rect", "saw-table", {
    x: width * 0.14,
    y: depth * 0.14,
    width: width * 0.72,
    height: depth * 0.72,
    rx: 0.12
  });
  appendDetail(group, "line", "saw-fence", {
    x1: width * 0.24,
    y1: depth * 0.28,
    x2: width * 0.24,
    y2: depth * 0.82
  });
  appendDetail(group, "circle", "saw-blade", {
    cx: width * 0.56,
    cy: depth * 0.5,
    r: Math.min(width, depth) * 0.15
  });
  appendDetail(group, "line", "saw-slot", {
    x1: width * 0.56,
    y1: depth * 0.3,
    x2: width * 0.56,
    y2: depth * 0.7
  });
}

function renderDrillPress(group, width, depth) {
  appendDetail(group, "rect", "drill-base", {
    x: width * 0.24,
    y: depth * 0.72,
    width: width * 0.52,
    height: depth * 0.18,
    rx: 0.08
  });
  appendDetail(group, "line", "drill-column", {
    x1: width * 0.5,
    y1: depth * 0.2,
    x2: width * 0.5,
    y2: depth * 0.78
  });
  appendDetail(group, "rect", "drill-head", {
    x: width * 0.29,
    y: depth * 0.12,
    width: width * 0.42,
    height: depth * 0.18,
    rx: 0.08
  });
  appendDetail(group, "rect", "drill-table", {
    x: width * 0.32,
    y: depth * 0.45,
    width: width * 0.36,
    height: depth * 0.14,
    rx: 0.05
  });
}

function renderWelder(group, width, depth) {
  appendDetail(group, "rect", "welder-body", {
    x: width * 0.18,
    y: depth * 0.18,
    width: width * 0.58,
    height: depth * 0.64,
    rx: 0.12
  });
  appendDetail(group, "line", "welder-handle", {
    x1: width * 0.29,
    y1: depth * 0.28,
    x2: width * 0.63,
    y2: depth * 0.28
  });
  appendDetail(group, "path", "welder-cable", {
    d: `M ${width * 0.76} ${depth * 0.5} C ${width * 1.02} ${depth * 0.55}, ${width * 0.84} ${depth * 0.9}, ${width * 0.55} ${depth * 0.86}`
  });
  appendDetail(group, "circle", "welder-wheel", { cx: width * 0.28, cy: depth * 0.83, r: Math.min(width, depth) * 0.06 });
  appendDetail(group, "circle", "welder-wheel", { cx: width * 0.68, cy: depth * 0.83, r: Math.min(width, depth) * 0.06 });
}

function renderMiterSaw(group, width, depth) {
  appendDetail(group, "rect", "miter-bench", {
    x: width * 0.06,
    y: depth * 0.28,
    width: width * 0.88,
    height: depth * 0.44,
    rx: 0.1
  });
  appendDetail(group, "circle", "miter-blade", {
    cx: width * 0.5,
    cy: depth * 0.5,
    r: Math.min(width, depth) * 0.18
  });
  appendDetail(group, "path", "miter-arm", {
    d: `M ${width * 0.34} ${depth * 0.35} L ${width * 0.5} ${depth * 0.5} L ${width * 0.65} ${depth * 0.35}`
  });
}

function renderAssemblyTable(group, width, depth) {
  appendDetail(group, "rect", "assembly-top", {
    x: width * 0.1,
    y: depth * 0.1,
    width: width * 0.8,
    height: depth * 0.8,
    rx: 0.12
  });
  for (let index = 1; index < 3; index += 1) {
    appendDetail(group, "line", "assembly-grid", {
      x1: width * 0.1,
      y1: depth * (0.1 + index * 0.8 / 3),
      x2: width * 0.9,
      y2: depth * (0.1 + index * 0.8 / 3)
    });
    appendDetail(group, "line", "assembly-grid", {
      x1: width * (0.1 + index * 0.8 / 3),
      y1: depth * 0.1,
      x2: width * (0.1 + index * 0.8 / 3),
      y2: depth * 0.9
    });
  }
}

function renderEntryDoor(group, width, depth) {
  appendDetail(group, "line", "door-threshold", {
    x1: 0.1,
    y1: depth * 0.18,
    x2: width - 0.1,
    y2: depth * 0.18
  });
  appendDetail(group, "line", "door-leaf", {
    x1: 0.1,
    y1: depth * 0.18,
    x2: Math.min(width - 0.1, depth * 1.85),
    y2: depth * 0.94
  });
  appendDetail(group, "path", "door-swing", {
    d: `M ${width - 0.1} ${depth * 0.18} A ${width * 0.9} ${width * 0.9} 0 0 1 ${Math.min(width - 0.1, depth * 1.85)} ${depth * 0.94}`
  });
}

function renderGarageDoor(group, width, depth) {
  appendDetail(group, "rect", "garage-track", {
    x: width * 0.05,
    y: depth * 0.2,
    width: width * 0.9,
    height: depth * 0.6,
    rx: 0.04
  });
  for (let index = 1; index < 6; index += 1) {
    appendDetail(group, "line", "garage-panel", {
      x1: width * (0.05 + index * 0.9 / 6),
      y1: depth * 0.2,
      x2: width * (0.05 + index * 0.9 / 6),
      y2: depth * 0.8
    });
  }
  appendDetail(group, "line", "garage-header", {
    x1: width * 0.04,
    y1: depth * 0.12,
    x2: width * 0.96,
    y2: depth * 0.12
  });
}

function renderItemImage(group, item, footprint) {
  const image = svgElement("svg", {
    class: "item-image",
    x: 0,
    y: 0,
    width: footprint.width,
    height: footprint.depth,
    viewBox: "0 0 100 100",
    preserveAspectRatio: "none",
    "aria-hidden": "true"
  });
  const symbol = document.getElementById(item.templateKey);
  if (symbol) {
    Array.from(symbol.children).forEach((child) => {
      if (child.tagName.toLowerCase() !== "style") {
        image.appendChild(child.cloneNode(true));
      }
    });
  }
  group.appendChild(image);
}

function renderItem(item) {
  const footprint = core.getFootprint(item);
  const group = svgElement("g", {
    class: `plan-item item-${item.templateKey}${item.category === "Openings" ? " opening-item" : ""}${item.id === selectedId ? " selected" : ""}`,
    transform: `translate(${item.x} ${item.y})`,
    "data-id": item.id,
    tabindex: "0",
    role: "button",
    "aria-label": `${item.label}, ${footprint.width} by ${footprint.depth} feet`
  });
  renderItemImage(group, item, footprint);
  group.addEventListener("pointerdown", startDrag);
  group.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectedId = item.id;
      render();
    }
  });
  return group;
}

function renderSvg() {
  svg.setAttribute("viewBox", `-0.25 -0.25 ${plan.floor.width + 0.5} ${plan.floor.depth + 0.5}`);
  svg.replaceChildren(
    svgElement("rect", {
      class: "floor-boundary",
      x: 0,
      y: 0,
      width: plan.floor.width,
      height: plan.floor.depth
    }),
    renderGrid(),
    ...plan.items.map(renderItem)
  );

  if (plan.items.length === 0) {
    const text = svgElement("text", {
      class: "empty-state",
      x: plan.floor.width / 2,
      y: plan.floor.depth / 2
    });
    text.textContent = "Add shelves, cabinets, benches, and tools from the left panel.";
    svg.appendChild(text);
  }
}

function render() {
  renderControls();
  renderSvg();
}

function pointFromEvent(event) {
  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  return point.matrixTransform(svg.getScreenCTM().inverse());
}

function startDrag(event) {
  const group = event.currentTarget;
  const item = plan.items.find((candidate) => candidate.id === group.dataset.id);
  if (!item) {
    return;
  }
  event.preventDefault();
  selectedId = item.id;
  const point = pointFromEvent(event);
  dragState = {
    id: item.id,
    startX: item.x,
    startY: item.y,
    pointerX: point.x,
    pointerY: point.y
  };
  render();
}

function moveDrag(event) {
  if (!dragState) {
    return;
  }
  const point = pointFromEvent(event);
  const item = plan.items.find((candidate) => candidate.id === dragState.id);
  if (!item) {
    dragState = null;
    return;
  }
  const nextItem = core.clampItemToFloor(
    {
      ...item,
      x: dragState.startX + point.x - dragState.pointerX,
      y: dragState.startY + point.y - dragState.pointerY
    },
    plan.floor
  );
  plan = {
    ...plan,
    items: plan.items.map((candidate) => (candidate.id === nextItem.id ? nextItem : candidate))
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
  render();
}

function stopDrag() {
  dragState = null;
}

floorForm.addEventListener("submit", (event) => {
  event.preventDefault();
  setPlan(core.updateFloor(plan, floorWidthInput.value, floorDepthInput.value));
});

itemForm.addEventListener("input", () => {
  const item = selectedItem();
  if (!item) {
    return;
  }
  updateItem(item.id, (current) => ({
    ...current,
    label: itemLabelInput.value.trim() || current.label,
    width: itemWidthInput.value,
    depth: itemDepthInput.value,
    x: itemXInput.value,
    y: itemYInput.value
  }));
});

rotateButton.addEventListener("click", () => {
  const item = selectedItem();
  if (item) {
    updateItem(item.id, (current) => core.rotateItem(current, plan.floor));
  }
});

deleteButton.addEventListener("click", () => {
  const item = selectedItem();
  if (!item) {
    return;
  }
  const remaining = plan.items.filter((candidate) => candidate.id !== item.id);
  selectedId = remaining[0] ? remaining[0].id : null;
  setPlan({ ...plan, items: remaining });
});

saveButton.addEventListener("click", () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
  flashButton(saveButton, "Saved");
});

loadButton.addEventListener("click", () => {
  const loaded = core.parsePlan(localStorage.getItem(STORAGE_KEY));
  if (loaded) {
    selectedId = loaded.items[0] ? loaded.items[0].id : null;
    setPlan(loaded);
    flashButton(loadButton, "Loaded");
  } else {
    flashButton(loadButton, "No saved plan");
  }
});

clearButton.addEventListener("click", () => {
  selectedId = null;
  setPlan({ ...plan, items: [] });
});

window.addEventListener("pointermove", moveDrag);
window.addEventListener("pointerup", stopDrag);

renderToolbox();
render();
