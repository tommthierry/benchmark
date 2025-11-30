// Model color assignment utility
// Provides consistent color mapping for models across the UI

const MODEL_COLORS = [
  'var(--model-color-0)',  // Red
  'var(--model-color-1)',  // Orange
  'var(--model-color-2)',  // Yellow
  'var(--model-color-3)',  // Green
  'var(--model-color-4)',  // Teal
  'var(--model-color-5)',  // Cyan
  'var(--model-color-6)',  // Blue
  'var(--model-color-7)',  // Violet
  'var(--model-color-8)',  // Purple
  'var(--model-color-9)',  // Pink
  'var(--model-color-10)', // Rose
  'var(--model-color-11)', // Slate
];

// Simple hash function for consistent color assignment
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// Get color for a model by ID (consistent across renders)
export function getModelColor(modelId: string): string {
  const index = hashString(modelId) % MODEL_COLORS.length;
  return MODEL_COLORS[index];
}

// Get color by index (for ordered display)
export function getModelColorByIndex(index: number): string {
  return MODEL_COLORS[index % MODEL_COLORS.length];
}

// Get a subtle background version of model color (10% opacity)
export function getModelColorBg(modelId: string): string {
  const color = getModelColor(modelId);
  // Extract the CSS variable and return with opacity
  return color.replace(')', '-bg)').replace('var(--model-color', 'var(--model-color');
}
