import './aim-guide.css';

const SVG_NS = 'http://www.w3.org/2000/svg';
/** Size of the dot under the finger, in CSS px. */
const TIP_RADIUS_PX = 10;

export interface AimGuide {
  /** Shows the drag from (startX, startY) to (x, y), with the ideal-force ring, in CSS px. */
  show(startX: number, startY: number, x: number, y: number, idealLengthPx: number): void;
  hide(): void;
}

/**
 * Overlay drawn while the player drags to aim: a line from where the finger went down to
 * where it is, and a dashed ring at the drag length of the ideal force. Updated only on
 * pointer moves, never per frame.
 */
export function createAimGuide(parent: HTMLElement): AimGuide {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.classList.add('aim-guide');
  const ring = document.createElementNS(SVG_NS, 'circle');
  ring.classList.add('aim-guide__ideal');
  const line = document.createElementNS(SVG_NS, 'line');
  line.classList.add('aim-guide__line');
  const tip = document.createElementNS(SVG_NS, 'circle');
  tip.classList.add('aim-guide__tip');
  tip.setAttribute('r', String(TIP_RADIUS_PX));
  svg.append(ring, line, tip);
  parent.append(svg);

  return {
    show(startX, startY, x, y, idealLengthPx) {
      svg.classList.add('aim-guide--visible');
      setAttributes(ring, { cx: startX, cy: startY, r: idealLengthPx });
      setAttributes(line, { x1: startX, y1: startY, x2: x, y2: y });
      setAttributes(tip, { cx: x, cy: y });
    },
    hide() {
      svg.classList.remove('aim-guide--visible');
    },
  };
}

function setAttributes(element: SVGElement, values: Record<string, number>): void {
  for (const [name, value] of Object.entries(values)) {
    element.setAttribute(name, String(value));
  }
}
