// Default cost code mapping for material categories
// This maps common material categories to their corresponding CSI MasterFormat cost codes
export const defaultCostCodeMap: Record<string, string> = {
  // Division 10 - Specialties
  "Toilet Accessories": "102800",
  "Bath Accessories": "102800", 
  "Partitions": "102813",
  "Toilet Partitions": "102813",
  "Fire Extinguishers": "105100",
  "Fire Extinguisher Cabinets": "105100",
  "Lockers": "105113",
  "Storage Lockers": "105113",
  "Signage": "101400",
  "Interior Signage": "101400",
  "Exterior Signage": "101400",
  
  // Division 08 - Openings
  "Doors": "081400",
  "Windows": "081600",
  "Hardware": "087100",
  "Door Hardware": "087100",
  "Window Hardware": "087100",
  
  // Division 09 - Finishes
  "Flooring": "096000",
  "Carpet": "096800",
  "Tile": "093000",
  "Paint": "099100",
  "Ceiling": "095100",
  "Drywall": "092900",
  
  // Division 22 - Plumbing
  "Plumbing": "220000",
  "Fixtures": "224000",
  "Plumbing Fixtures": "224000",
  "Water Heaters": "223000",
  "Pipes": "221100",
  "Plumbing Pipes": "221100",
  
  // Division 23 - HVAC
  "HVAC": "230000",
  "Ductwork": "233100",
  "Air Conditioning": "238100",
  "Heating": "235100",
  "Ventilation": "233000",
  
  // Division 26 - Electrical
  "Electrical": "260000",
  "Lighting": "265000",
  "Switches": "262700",
  "Outlets": "262700",
  "Conduit": "260500",
  "Wire": "260519",
  "Cable": "271500",
  
  // Division 03 - Concrete
  "Concrete": "033000",
  "Rebar": "032000",
  "Concrete Forms": "031000",
  
  // Division 05 - Metals
  "Steel": "051200",
  "Metal Framing": "054000",
  "Structural Steel": "051200",
  
  // Division 06 - Wood & Plastics
  "Lumber": "061000",
  "Wood": "061000",
  "Millwork": "062000",
  "Cabinets": "064100",
  
  // Division 07 - Thermal & Moisture Protection
  "Insulation": "072100",
  "Roofing": "076200",
  "Siding": "074600",
  "Waterproofing": "071300",
  
  // Division 04 - Masonry
  "Masonry": "042000",
  "Brick": "042300",
  "Block": "042000",
  "Stone": "043000",
  
  // Default/Unknown
  "Other": "010000",
  "General": "010000",
  "Miscellaneous": "010000"
};

// Function to get cost code for a category
export function getCostCodeForCategory(category: string): string | null {
  if (!category) return null;
  
  // Direct match
  const directMatch = defaultCostCodeMap[category];
  if (directMatch) return directMatch;
  
  // Fuzzy match - check if category contains any of the mapped category names
  const categoryLower = category.toLowerCase();
  for (const [mappedCategory, costCode] of Object.entries(defaultCostCodeMap)) {
    if (categoryLower.includes(mappedCategory.toLowerCase()) || 
        mappedCategory.toLowerCase().includes(categoryLower)) {
      return costCode;
    }
  }
  
  return null; // No match found
}

// Function to get all available categories
export function getAvailableCategories(): string[] {
  return Object.keys(defaultCostCodeMap);
}

// Function to validate cost code format
export function isValidCostCode(costCode: string): boolean {
  // CSI MasterFormat cost codes are typically 6 digits
  return /^\d{6}$/.test(costCode);
}

// Division to CSI code mapping
export const divisionToCsiMap: Record<string, string> = {
  "02-Site Work": "020000",
  "03-Concrete": "033000", 
  "04-Masonry": "042000",
  "05-Metals": "051200",
  "06-Wood": "061000",
  "07-Thermal": "072100",
  "08-Openings": "081400",
  "09-Finishes": "096000",
  "10-Specialties": "102800",
  "21-Fire Suppression": "210000",
  "22-Plumbing": "220000",
  "23-HVAC": "230000",
  "26-Electrical": "260000",
  "27-Communications": "271500"
};

// Function to normalize cost codes to 6-digit CSI format
export function normalizeCostCode(costCode: string): string {
  if (!costCode) return "010000"; // Default
  
  // If already 6-digit, return as-is
  if (isValidCostCode(costCode)) {
    return costCode;
  }
  
  // Check division mapping
  if (divisionToCsiMap[costCode]) {
    return divisionToCsiMap[costCode];
  }
  
  // Handle partial matches like "10-28-Toilet" -> closest match
  for (const [division, csi] of Object.entries(divisionToCsiMap)) {
    if (costCode.startsWith(division.split('-')[0] + '-')) {
      return csi;
    }
  }
  
  // If 4-5 digit, pad with zeros
  const numOnly = costCode.replace(/[^0-9]/g, '');
  if (numOnly.length >= 4) {
    return numOnly.padEnd(6, '0');
  }
  
  return "010000"; // Default fallback
}