/**
 * Utility functions for number formatting and validation
 */

/**
 * Formats a number with commas and limits to 2 decimal places
 * @param value - The number to format
 * @param maxDecimals - Maximum number of decimal places (default: 2)
 * @returns Formatted string
 */
export function formatNumber(value: number | string, maxDecimals: number = 2): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '';
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  }).format(num);
}

/**
 * Formats a currency value with commas and 2 decimal places
 * @param value - The currency value to format
 * @returns Formatted currency string
 */
export function formatCurrency(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '$0.00';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num);
}

/**
 * Parses a formatted number string back to a number
 * @param value - The formatted string to parse
 * @returns Parsed number or NaN if invalid
 */
export function parseFormattedNumber(value: string): number {
  // Remove commas and parse
  const cleaned = value.replace(/,/g, '');
  return parseFloat(cleaned);
}

/**
 * Validates and formats number input for forms
 * @param value - Input value
 * @param maxDecimals - Maximum decimal places
 * @returns Formatted value or empty string if invalid
 */
export function formatNumberInput(value: string, maxDecimals: number = 2): string {
  // Remove any non-digit, non-decimal, non-comma characters
  let cleaned = value.replace(/[^\d.,]/g, '');
  
  // Remove extra commas and decimals
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  }
  
  // Limit decimal places
  if (parts.length === 2 && parts[1].length > maxDecimals) {
    cleaned = parts[0] + '.' + parts[1].substring(0, maxDecimals);
  }
  
  const num = parseFormattedNumber(cleaned);
  if (isNaN(num)) return '';
  
  return formatNumber(num, maxDecimals);
}

/**
 * Creates an onChange handler for number inputs that formats the value
 * @param onChange - The original onChange handler
 * @param maxDecimals - Maximum decimal places
 */
export function createNumberInputHandler(
  onChange: (value: string) => void,
  maxDecimals: number = 2
) {
  return (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatNumberInput(e.target.value, maxDecimals);
    onChange(formatted);
  };
}