/** PNG export — fixed cell width so mobile captures match desktop grid proportions. */
export const ROSTER_EXPORT_CELL_WIDTH = '104px';
export const ROSTER_EXPORT_GRID_GAP = '8px';
export const ROSTER_EXPORT_CELL_HEIGHT = '144px';
export const ROSTER_EXPORT_ROOT_PADDING = '32px';

const ROSTER_EXPORT_CELL_PX = parseInt(ROSTER_EXPORT_CELL_WIDTH, 10);
const ROSTER_EXPORT_GAP_PX = parseInt(ROSTER_EXPORT_GRID_GAP, 10);
const ROSTER_EXPORT_PADDING_PX = parseInt(ROSTER_EXPORT_ROOT_PADDING, 10);

/** 7 day columns + 6 gaps — same width on every device during PNG export. */
export const ROSTER_EXPORT_GRID_WIDTH = `${
  7 * ROSTER_EXPORT_CELL_PX + 6 * ROSTER_EXPORT_GAP_PX
}px`;

export const ROSTER_EXPORT_ROOT_WIDTH = `${
  7 * ROSTER_EXPORT_CELL_PX + 6 * ROSTER_EXPORT_GAP_PX + 2 * ROSTER_EXPORT_PADDING_PX
}px`;

export const ROSTER_EXPORT_GRID_TEMPLATE = `repeat(7, ${ROSTER_EXPORT_CELL_WIDTH})`;
