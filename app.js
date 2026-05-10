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

function renderItem(item) {
  const footprint = core.getFootprint(item);
  const group = svgElement("g", {
    class: `plan-item${item.id === selectedId ? " selected" : ""}`,
    transform: `translate(${item.x} ${item.y})`,
    "data-id": item.id,
    tabindex: "0",
    role: "button",
    "aria-label": `${item.label}, ${footprint.width} by ${footprint.depth} feet`
  });
  const rect = svgElement("rect", {
    class: "item-shape",
    width: footprint.width,
    height: footprint.depth,
    rx: Math.min(0.25, footprint.width / 8, footprint.depth / 8)
  });
  const label = svgElement("text", {
    class: "item-label",
    x: footprint.width / 2,
    y: footprint.depth / 2,
    "text-anchor": "middle",
    "dominant-baseline": "central"
  });
  label.textContent = item.label.length > 20 ? `${item.label.slice(0, 18)}...` : item.label;

  const title = svgElement("title");
  title.textContent = `${item.label} (${item.width} x ${item.depth} ft, rotated ${item.rotation} degrees)`;

  group.append(title, rect, label);
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
