import * as XLSX from 'xlsx';
import { db } from '../db';
import { 
  materialImportRuns, 
  materialImportLines, 
  projectMaterials,
  projectBudgetRollups,
  projects
} from '@shared/schema';
import type { 
  InsertMaterialImportRun,
  InsertMaterialImportLine, 
  InsertProjectMaterial,
  MaterialImportLine,
  MaterialImportRun
} from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getCostCodeForCategory, isValidCostCode } from '../config/cost-code-map';

export interface ParsedMaterialRow {
  category?: string;
  model?: string;
  description: string;
  unit: string;
  qty: number;
  unitPrice: number;
  costCode?: string;
  phaseCode?: string;
  errors: string[];
  warnings: string[];
}

export interface ColumnMapping {
  [sourceColumn: string]: string;
}

export class MaterialImportService {
  
  // Create a new import run
  async createImportRun(data: InsertMaterialImportRun): Promise<MaterialImportRun> {
    const [run] = await db.insert(materialImportRuns).values(data).returning();
    return run;
  }
  
  // Get import run by ID
  async getImportRun(runId: string, organizationId: string): Promise<MaterialImportRun | null> {
    const [run] = await db
      .select()
      .from(materialImportRuns)
      .where(and(
        eq(materialImportRuns.id, runId),
        eq(materialImportRuns.organizationId, organizationId)
      ));
    return run || null;
  }
  
  // Get import run with lines
  async getImportRunWithLines(runId: string, organizationId: string) {
    const run = await this.getImportRun(runId, organizationId);
    if (!run) return null;
    
    const lines = await db
      .select()
      .from(materialImportLines)
      .where(eq(materialImportLines.runId, runId))
      .orderBy(materialImportLines.createdAt);
    
    return { ...run, lines };
  }
  
  // Parse Excel/CSV file and create import lines
  async parseExcelFile(
    runId: string, 
    fileBuffer: Buffer, 
    columnMapping?: ColumnMapping,
    projectCode?: string
  ): Promise<{ success: boolean; message: string; lineCount: number }> {
    try {
      // Parse file (supports Excel and CSV)
      const workbook = XLSX.read(fileBuffer, { 
        type: 'buffer',
        cellDates: true,
        cellNF: false,
        cellText: false
      });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        defval: '',
        blankrows: false
      });
      
      if (jsonData.length < 2) {
        return { success: false, message: 'File must contain at least a header row and one data row', lineCount: 0 };
      }
      
      const headers = jsonData[0] as string[];
      const dataRows = jsonData.slice(1) as any[][];
      
      console.log('Excel headers found:', headers);
      
      // Apply column mapping or use default mapping
      const mapping = columnMapping || this.getDefaultColumnMapping(headers);
      
      console.log('Final column mapping:', mapping);
      
      const parsedLines: InsertMaterialImportLine[] = [];
      
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        if (this.isEmptyRow(row)) continue;
        
        const parsedRow = this.parseRow(headers, row, mapping, projectCode, i + 2); // +2 for Excel row number
        
        parsedLines.push({
          runId,
          rawRowJson: this.createRowJson(headers, row),
          category: parsedRow.category,
          model: parsedRow.model,
          description: parsedRow.description,
          unit: parsedRow.unit,
          qty: parsedRow.qty.toString(),
          unitPrice: parsedRow.unitPrice.toString(),
          costCode: parsedRow.costCode,
          phaseCode: parsedRow.phaseCode,
          projectCode: projectCode,
          valid: parsedRow.errors.length === 0,
          errorsJson: parsedRow.errors.length > 0 ? parsedRow.errors : null,
          suggestionsJson: parsedRow.warnings.length > 0 ? parsedRow.warnings : null
        });
      }
      
      // Insert all lines in batch
      if (parsedLines.length > 0) {
        await db.insert(materialImportLines).values(parsedLines);
      }
      
      // Update run status and row count
      await db
        .update(materialImportRuns)
        .set({ 
          status: 'review', 
          rowCount: parsedLines.length,
          updatedAt: sql`now()`
        })
        .where(eq(materialImportRuns.id, runId));
      
      return { 
        success: true, 
        message: `Successfully parsed ${parsedLines.length} rows`, 
        lineCount: parsedLines.length 
      };
      
    } catch (error) {
      console.error('Error parsing Excel file:', error);
      
      // Update run status to error
      await db
        .update(materialImportRuns)
        .set({ 
          status: 'rejected',
          warningsJson: [error instanceof Error ? error.message : 'Unknown parsing error'],
          updatedAt: sql`now()`
        })
        .where(eq(materialImportRuns.id, runId));
      
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to parse file', 
        lineCount: 0 
      };
    }
  }
  
  // Update a single import line
  async updateImportLine(
    lineId: string, 
    updates: Partial<MaterialImportLine>,
    organizationId: string
  ): Promise<boolean> {
    try {
      // Verify the line belongs to a run in this organization
      const [line] = await db
        .select({ runId: materialImportLines.runId })
        .from(materialImportLines)
        .innerJoin(materialImportRuns, eq(materialImportLines.runId, materialImportRuns.id))
        .where(and(
          eq(materialImportLines.id, lineId),
          eq(materialImportRuns.organizationId, organizationId)
        ));
      
      if (!line) return false;
      
      // Re-validate if key fields changed
      const validationUpdates: any = { ...updates };
      if (updates.description || updates.unit || updates.qty || updates.costCode) {
        const errors = this.validateLineData({
          description: updates.description || '',
          unit: updates.unit || '',
          qty: updates.qty ? Number(updates.qty) : 0,
          costCode: updates.costCode || undefined,
        });
        
        validationUpdates.valid = errors.length === 0;
        validationUpdates.errorsJson = errors.length > 0 ? errors : null;
      }
      
      validationUpdates.updatedAt = sql`now()`;
      
      await db
        .update(materialImportLines)
        .set(validationUpdates)
        .where(eq(materialImportLines.id, lineId));
      
      return true;
    } catch (error) {
      console.error('Error updating import line:', error);
      return false;
    }
  }
  
  // Delete a single import line
  async deleteImportLine(
    lineId: string, 
    organizationId: string
  ): Promise<boolean> {
    try {
      // Verify the line belongs to a run in this organization
      const [line] = await db
        .select({ runId: materialImportLines.runId })
        .from(materialImportLines)
        .innerJoin(materialImportRuns, eq(materialImportLines.runId, materialImportRuns.id))
        .where(and(
          eq(materialImportLines.id, lineId),
          eq(materialImportRuns.organizationId, organizationId)
        ));
      
      if (!line) return false;
      
      await db
        .delete(materialImportLines)
        .where(eq(materialImportLines.id, lineId));
      
      return true;
    } catch (error) {
      console.error('Error deleting import line:', error);
      return false;
    }
  }
  
  // Approve import run and create project materials
  async approveImportRun(runId: string, organizationId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Get run and verify ownership
      const run = await this.getImportRun(runId, organizationId);
      if (!run) {
        return { success: false, message: 'Import run not found' };
      }
      
      if (run.status === 'approved') {
        return { success: false, message: 'Import run already approved' };
      }
      
      // Get all valid lines
      const validLines = await db
        .select()
        .from(materialImportLines)
        .where(and(
          eq(materialImportLines.runId, runId),
          eq(materialImportLines.valid, true)
        ));
      
      if (validLines.length === 0) {
        return { success: false, message: 'No valid lines to approve' };
      }
      
      // Create project materials from valid lines
      const projectMaterialsData: InsertProjectMaterial[] = validLines.map(line => ({
        projectId: run.projectId,
        organizationId: run.organizationId,
        category: line.category,
        model: line.model,
        description: line.description!,
        unit: line.unit!,
        qty: line.qty!,
        unitPrice: line.unitPrice || '0',
        costCode: line.costCode,
        phaseCode: line.phaseCode,
        projectCode: line.projectCode,
        source: 'import',
        importRunId: runId || undefined
      }));
      
      await db.insert(projectMaterials).values(projectMaterialsData);
      
      // Update budget rollups
      await this.updateBudgetRollups(run.projectId, run.organizationId, validLines);
      
      // Mark run as approved
      await db
        .update(materialImportRuns)
        .set({ 
          status: 'approved',
          updatedAt: sql`now()`
        })
        .where(eq(materialImportRuns.id, runId));
      
      return { 
        success: true, 
        message: `Successfully approved ${validLines.length} materials` 
      };
      
    } catch (error) {
      console.error('Error approving import run:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to approve import' 
      };
    }
  }
  
  // Reject import run
  async rejectImportRun(runId: string, organizationId: string): Promise<boolean> {
    try {
      const run = await this.getImportRun(runId, organizationId);
      if (!run) return false;
      
      await db
        .update(materialImportRuns)
        .set({ 
          status: 'rejected',
          updatedAt: sql`now()`
        })
        .where(eq(materialImportRuns.id, runId));
      
      return true;
    } catch (error) {
      console.error('Error rejecting import run:', error);
      return false;
    }
  }
  
  // Helper methods
  private getDefaultColumnMapping(headers: string[]): ColumnMapping {
    const mapping: ColumnMapping = {};
    const lowerHeaders = headers.map(h => h.toLowerCase().trim());
    
    // Map common column names - order matters! More specific patterns first
    const mappings = [
      { patterns: ['category', 'cat'], target: 'category' },
      { patterns: ['model', 'model #', 'model number', 'part'], target: 'model' },
      { patterns: ['description', 'desc', 'name', 'item name'], target: 'description' },
      // Unit price patterns MUST come before 'unit' to avoid 'unit' matching 'unit price'
      { patterns: ['unit price', 'unitprice', 'unit cost', 'each', 'cost each', 'rate', 'per unit', 'unit rate', 'cost per unit', 'price per unit', 'price'], target: 'unitPrice' },
      { patterns: ['unit', 'uom', 'unit of measure'], target: 'unit' },
      { patterns: ['qty', 'quantity', 'count', 'amount'], target: 'qty' },
      { patterns: ['cost code', 'costcode'], target: 'costCode' },
      { patterns: ['phase', 'phase code', 'phasecode'], target: 'phaseCode' }
    ];
    
    for (let i = 0; i < headers.length; i++) {
      const header = lowerHeaders[i];
      
      for (const { patterns, target } of mappings) {
        if (patterns.some(pattern => header.includes(pattern))) {
          mapping[headers[i]] = target;
          break;
        }
      }
    }
    
    console.log('Column mapping result:', mapping);
    return mapping;
  }
  
  private parseRow(
    headers: string[], 
    row: any[], 
    mapping: ColumnMapping, 
    projectCode?: string,
    rowNumber?: number
  ): ParsedMaterialRow {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Extract values using mapping
    const getValue = (field: string): any => {
      const headerKey = Object.keys(mapping).find(key => mapping[key] === field);
      if (!headerKey) return undefined;
      const index = headers.indexOf(headerKey);
      return index >= 0 ? row[index] : undefined;
    };
    
    const category = this.cleanString(getValue('category'));
    const model = this.cleanString(getValue('model'));
    const description = this.cleanString(getValue('description'));
    const unit = this.cleanString(getValue('unit'));
    const qtyValue = getValue('qty');
    const priceValue = getValue('unitPrice');
    let costCode = this.cleanString(getValue('costCode'));
    const phaseCode = this.cleanString(getValue('phaseCode'));
    
    console.log(`Row ${rowNumber}: priceValue =`, priceValue, 'typeof:', typeof priceValue);
    
    // Validate required fields
    if (!description) errors.push('Description is required');
    if (!unit) errors.push('Unit is required');
    
    // Parse and validate quantity
    let qty = 0;
    if (qtyValue === undefined || qtyValue === '') {
      errors.push('Quantity is required');
    } else {
      const parsedQty = Number(qtyValue);
      if (isNaN(parsedQty) || parsedQty < 0) {
        errors.push('Quantity must be a valid number >= 0');
      } else {
        qty = parsedQty;
      }
    }
    
    // Parse and validate unit price
    let unitPrice = 0;
    if (priceValue !== undefined && priceValue !== '') {
      // Clean price value: remove currency symbols, commas, and extra spaces
      const cleanedPrice = String(priceValue)
        .replace(/[$,\s]/g, '') // Remove $, commas, and spaces
        .replace(/[^\d.-]/g, ''); // Keep only digits, dots, and minus signs
      
      console.log(`Row ${rowNumber}: cleanedPrice =`, cleanedPrice);
      
      const parsedPrice = Number(cleanedPrice);
      console.log(`Row ${rowNumber}: parsedPrice =`, parsedPrice);
      
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        errors.push('Unit price must be a valid number >= 0');
      } else {
        unitPrice = parsedPrice;
      }
    } else {
      console.log(`Row ${rowNumber}: priceValue is empty or undefined`);
    }
    
    // Handle cost code mapping
    if (!costCode && category) {
      const mappedCode = getCostCodeForCategory(category);
      if (mappedCode) {
        costCode = mappedCode;
        warnings.push(`Applied default cost code ${mappedCode} for category "${category}"`);
      }
    }
    
    // Validate cost code format
    if (costCode && !isValidCostCode(costCode)) {
      errors.push('Cost code must be a 6-digit number');
    }
    
    if (!costCode) {
      errors.push('Cost code is required (either provide in file or use recognized category)');
    }
    
    return {
      category,
      model,
      description: description || '',
      unit: unit || '',
      qty,
      unitPrice,
      costCode,
      phaseCode,
      errors,
      warnings
    };
  }
  
  private validateLineData(data: { description: string; unit: string; qty: number; costCode?: string }): string[] {
    const errors: string[] = [];
    
    if (!data.description?.trim()) errors.push('Description is required');
    if (!data.unit?.trim()) errors.push('Unit is required');
    if (data.qty < 0) errors.push('Quantity must be >= 0');
    if (data.costCode && !isValidCostCode(data.costCode)) errors.push('Cost code must be a 6-digit number');
    
    return errors;
  }
  
  private cleanString(value: any): string | undefined {
    if (value === undefined || value === null) return undefined;
    const str = String(value).trim();
    return str === '' ? undefined : str;
  }
  
  private isEmptyRow(row: any[]): boolean {
    return row.every(cell => cell === undefined || cell === null || String(cell).trim() === '');
  }
  
  private createRowJson(headers: string[], row: any[]): any {
    const obj: any = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  }
  
  private async updateBudgetRollups(
    projectId: string, 
    organizationId: string, 
    lines: MaterialImportLine[]
  ): Promise<void> {
    // Group lines by cost code and calculate totals
    const costCodeTotals: Record<string, number> = {};
    
    for (const line of lines) {
      if (line.costCode && line.qty && line.unitPrice) {
        const total = Number(line.qty) * Number(line.unitPrice);
        costCodeTotals[line.costCode] = (costCodeTotals[line.costCode] || 0) + total;
      }
    }
    
    // Update or insert budget rollups
    for (const [costCode, totalValue] of Object.entries(costCodeTotals)) {
      await db
        .insert(projectBudgetRollups)
        .values({
          projectId,
          organizationId,
          costCode,
          totalMaterialsValue: totalValue.toString()
        })
        .onConflictDoUpdate({
          target: [projectBudgetRollups.projectId, projectBudgetRollups.costCode],
          set: {
            totalMaterialsValue: sql`${projectBudgetRollups.totalMaterialsValue} + ${totalValue}`,
            updatedAt: sql`now()`
          }
        });
    }
  }
  
  // Generate Excel template
  generateTemplate(): Buffer {
    const templateData = [
      ['Category', 'Description', 'Model #', 'Qty', 'Unit', 'Unit Price', 'Cost Code', 'Phase Code'],
      ['Toilet Accessories', 'Paper towel dispenser', 'B-2620', '5', 'EA', '85.50', '102800', ''],
      ['Partitions', 'Toilet partition hardware', 'BTP-100', '3', 'SET', '125.00', '102813', ''],
      ['Fire Extinguishers', '5lb ABC fire extinguisher', 'B402', '10', 'EA', '45.00', '105100', '']
    ];
    
    const worksheet = XLSX.utils.aoa_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Material Import Template');
    
    return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
  }
}

export const materialImportService = new MaterialImportService();