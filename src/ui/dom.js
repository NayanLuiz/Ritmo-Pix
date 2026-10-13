// Helper mínimo para montar DOM sem innerHTML: todo texto vira nó de texto (sem risco de XSS).
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value == null || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value === true) el.setAttribute(key, '');
    else el.setAttribute(key, value);
  }
  append(el, ...children);
  return el;
}

export function append(el, ...children) {
  const flatChildren = children.flat(Infinity);
  for (const child of flatChildren) {
    if (child == null || child === false) continue;
    el.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return el;
}

export function clear(el) {
  el.replaceChildren();
  return el;
}

export const icon = (classes) => h('i', { class: classes, 'aria-hidden': 'true' });
