import express from 'express';
import multer from 'multer';
import { z } from 'zod';
import { materialImportService } from '../services/materialImportService';
import { authenticateToken } from '../middleware/auth';
import type { AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
      'application/csv' // Alternative CSV mime type
    ];
    
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const hasValidType = allowedTypes.includes(file.mimetype);
    const hasValidExtension = allowedExtensions.some(ext => file.originalname.toLowerCase().endsWith(ext));
    
    if (hasValidType || hasValidExtension) {
      cb(null, true);
    } else {
      cb(new Error('Only .xlsx, .xls, and .csv files are allowed'));
    }
  }
});

// Upload Excel file for material import
router.post('/projects/:projectId/material-import/upload', authenticateToken, upload.single('file'), async (req: AuthenticatedRequest, res) => {
  try {
    const { projectId } = req.params;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Create import run
    const run = await materialImportService.createImportRun({
      projectId,
      organizationId: req.user!.organizationId,
      uploadedByUserId: req.user!.id,
      sourceFilename: file.originalname,
      status: 'pending'
    });

    // Get project code - for now we'll use project number
    // In a real app, you'd fetch this from the projects table
    const projectCode = projectId.slice(0, 8); // Mock project code

    // Parse the file immediately (supports Excel and CSV)
    const parseResult = await materialImportService.parseExcelFile(
      run.id,
      file.buffer,
      undefined, // Use default column mapping
      projectCode
    );

    if (parseResult.success) {
      res.json({
        runId: run.id,
        message: parseResult.message,
        lineCount: parseResult.lineCount
      });
    } else {
      res.status(400).json({
        error: parseResult.message
      });
    }

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Upload failed' 
    });
  }
});

// Parse uploaded file (if not auto-parsed)
router.post('/material-imports/:runId/parse', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { runId } = req.params;
    const { columnMapping } = req.body;

    const run = await materialImportService.getImportRun(runId, req.user!.organizationId);
    if (!run) {
      return res.status(404).json({ error: 'Import run not found' });
    }

    // For this implementation, parsing happens during upload
    // This endpoint could be used for re-parsing with different column mappings
    res.json({ message: 'Parsing completed during upload' });

  } catch (error) {
    console.error('Parse error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Parse failed' 
    });
  }
});

// Get import run details with lines
router.get('/material-imports/:runId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { runId } = req.params;
    const { page = '1', limit = '50' } = req.query;

    const runWithLines = await materialImportService.getImportRunWithLines(
      runId, 
      req.user!.organizationId
    );

    if (!runWithLines) {
      return res.status(404).json({ error: 'Import run not found' });
    }

    // Simple pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;
    
    const paginatedLines = runWithLines.lines.slice(offset, offset + limitNum);

    // Calculate summary stats
    const validLines = runWithLines.lines.filter(line => line.valid).length;
    const invalidLines = runWithLines.lines.length - validLines;
    
    // Calculate totals by cost code
    const costCodeTotals: Record<string, { qty: number; value: number }> = {};
    runWithLines.lines.forEach(line => {
      if (line.costCode && line.valid && line.qty && line.unitPrice) {
        if (!costCodeTotals[line.costCode]) {
          costCodeTotals[line.costCode] = { qty: 0, value: 0 };
        }
        costCodeTotals[line.costCode].qty += Number(line.qty);
        costCodeTotals[line.costCode].value += Number(line.qty) * Number(line.unitPrice);
      }
    });

    res.json({
      ...runWithLines,
      lines: paginatedLines,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: runWithLines.lines.length,
        totalPages: Math.ceil(runWithLines.lines.length / limitNum)
      },
      summary: {
        totalLines: runWithLines.lines.length,
        validLines,
        invalidLines,
        costCodeTotals
      }
    });

  } catch (error) {
    console.error('Get import run error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get import run' 
    });
  }
});

// Update a single import line
const updateLineSchema = z.object({
  category: z.string().optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  sku: z.string().optional(),
  description: z.string().optional(),
  unit: z.string().optional(),
  qty: z.string().optional(),
  unitPrice: z.string().optional(),
  costCode: z.string().optional(),
  phaseCode: z.string().optional()
});

router.patch('/material-imports/:runId/line/:lineId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { runId, lineId } = req.params;
    
    const validatedData = updateLineSchema.parse(req.body);
    
    const success = await materialImportService.updateImportLine(
      lineId,
      validatedData,
      req.user!.organizationId
    );

    if (success) {
      res.json({ message: 'Line updated successfully' });
    } else {
      res.status(404).json({ error: 'Line not found or access denied' });
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
    } else {
      console.error('Update line error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to update line' 
      });
    }
  }
});

// Approve import run
router.post('/material-imports/:runId/approve', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { runId } = req.params;

    const result = await materialImportService.approveImportRun(
      runId,
      req.user!.organizationId
    );

    if (result.success) {
      res.json({ message: result.message });
    } else {
      res.status(400).json({ error: result.message });
    }

  } catch (error) {
    console.error('Approve import error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to approve import' 
    });
  }
});

// Reject import run
router.post('/material-imports/:runId/reject', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { runId } = req.params;

    const success = await materialImportService.rejectImportRun(
      runId,
      req.user!.organizationId
    );

    if (success) {
      res.json({ message: 'Import run rejected' });
    } else {
      res.status(404).json({ error: 'Import run not found' });
    }

  } catch (error) {
    console.error('Reject import error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to reject import' 
    });
  }
});

// Download Excel template
router.get('/material-import/template', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const templateBuffer = materialImportService.generateTemplate();
    
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="material-import-template.xlsx"',
      'Content-Length': templateBuffer.length
    });

    res.send(templateBuffer);

  } catch (error) {
    console.error('Template download error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to generate template' 
    });
  }
});

export default router;