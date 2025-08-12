import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { QuoteAnalysisLine } from '@/types';

const mockQuoteData = {
  rfqNumber: 'RFQ-2024-012',
  title: 'Restroom Accessories - Zone B-3',
  vendors: {
    'vendor1': { name: 'ABC Supply', id: 'vendor1' },
    'vendor2': { name: 'Bobrick Hardware', id: 'vendor2' },
    'vendor3': { name: 'Commercial Fixtures', id: 'vendor3' }
  },
  lines: [
    {
      id: '1',
      description: 'Paper Towel Dispenser',
      sku: 'BOB-2888-SS',
      quantity: 6,
      vendors: {
        vendor1: { unitPrice: 142.50, leadTime: '5-7 days', total: 855.00 },
        vendor2: { unitPrice: 135.80, leadTime: '3-5 days', total: 814.80, isBest: true },
        vendor3: { unitPrice: 148.75, leadTime: '7-10 days', total: 892.50 }
      },
      selectedVendorId: 'vendor2'
    },
    {
      id: '2',
      description: 'Grab Bar 36"',
      sku: 'BOB-B-4386',
      quantity: 12,
      vendors: {
        vendor1: { unitPrice: 89.25, leadTime: '5-7 days', total: 1071.00, isBest: true },
        vendor2: { unitPrice: 95.50, leadTime: '3-5 days', total: 1146.00 },
        vendor3: null // No quote
      },
      selectedVendorId: 'vendor1'
    },
    {
      id: '3',
      description: 'Toilet Seat Cover Dispenser',
      sku: 'BOB-B-221',
      quantity: 8,
      vendors: {
        vendor1: { unitPrice: 67.80, leadTime: '5-7 days', total: 542.40 },
        vendor2: { unitPrice: 63.25, leadTime: '3-5 days', total: 506.00, isBest: true },
        vendor3: { unitPrice: 71.50, leadTime: '7-10 days', total: 572.00 }
      },
      selectedVendorId: 'vendor2'
    }
  ] as QuoteAnalysisLine[]
};

export default function QuoteAnalysisMatrix() {
  const [selectedVendors, setSelectedVendors] = useState<Record<string, string>>(
    Object.fromEntries(mockQuoteData.lines.map(line => [line.id, line.selectedVendorId || '']))
  );

  const handleVendorSelection = (lineId: string, vendorId: string) => {
    setSelectedVendors(prev => ({
      ...prev,
      [lineId]: vendorId
    }));
  };

  const calculateTotals = () => {
    const vendorTotals: Record<string, number> = {};
    let selectedTotal = 0;

    mockQuoteData.lines.forEach(line => {
      Object.entries(line.vendors).forEach(([vendorId, quote]) => {
        if (quote) {
          vendorTotals[vendorId] = (vendorTotals[vendorId] || 0) + quote.total;
        }
      });

      const selectedVendor = selectedVendors[line.id];
      const selectedQuote = line.vendors[selectedVendor];
      if (selectedQuote) {
        selectedTotal += selectedQuote.total;
      }
    });

    const highestTotal = Math.max(...Object.values(vendorTotals));
    const savings = highestTotal - selectedTotal;

    return { vendorTotals, selectedTotal, savings };
  };

  const { vendorTotals, selectedTotal, savings } = calculateTotals();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Quote Analysis: {mockQuoteData.rfqNumber}</CardTitle>
          <p className="text-sm text-slate-500 mt-1">{mockQuoteData.title}</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" size="sm" data-testid="export-csv-button">
            Export CSV
          </Button>
          <Button size="sm" data-testid="convert-to-po-button">
            Convert Selected to PO
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px] bg-slate-50 sticky left-0">Material</TableHead>
                <TableHead className="text-center bg-slate-50">Qty</TableHead>
                <TableHead className="text-center bg-slate-50">ABC Supply</TableHead>
                <TableHead className="text-center bg-slate-50">Bobrick Hardware</TableHead>
                <TableHead className="text-center bg-slate-50">Commercial Fixtures</TableHead>
                <TableHead className="text-center bg-slate-50">Selected</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockQuoteData.lines.map((line) => (
                <TableRow key={line.id} className="hover:bg-slate-50">
                  <TableCell className="bg-slate-50 sticky left-0">
                    <div className="font-medium text-slate-900">{line.description}</div>
                    <div className="text-sm text-slate-500">{line.sku}</div>
                  </TableCell>
                  <TableCell className="text-center">{line.quantity}</TableCell>
                  
                  {/* Vendor columns */}
                  {Object.keys(mockQuoteData.vendors).map((vendorId) => {
                    const quote = line.vendors[vendorId];
                    if (!quote) {
                      return (
                        <TableCell key={vendorId} className="text-center">
                          <div className="text-slate-400">No Quote</div>
                        </TableCell>
                      );
                    }

                    const isBest = quote.isBest;
                    return (
                      <TableCell
                        key={vendorId}
                        className={`text-center ${isBest ? 'bg-green-50' : ''}`}
                      >
                        <div className={`font-medium ${isBest ? 'text-green-700' : ''}`}>
                          {formatCurrency(quote.unitPrice)}
                        </div>
                        <div className={`text-sm ${isBest ? 'text-green-600' : 'text-slate-500'}`}>
                          {quote.leadTime}
                        </div>
                        <div className={`text-xs font-medium ${isBest ? 'text-green-500' : 'text-slate-400'}`}>
                          Total: {formatCurrency(quote.total)}
                        </div>
                        {isBest && (
                          <Badge variant="secondary" className="mt-1 bg-green-100 text-green-800">
                            Best Price
                          </Badge>
                        )}
                      </TableCell>
                    );
                  })}

                  {/* Selection column */}
                  <TableCell className="text-center">
                    <RadioGroup
                      value={selectedVendors[line.id]}
                      onValueChange={(value) => handleVendorSelection(line.id, value)}
                    >
                      {Object.keys(mockQuoteData.vendors).map((vendorId) => {
                        if (!line.vendors[vendorId]) return null;
                        return (
                          <RadioGroupItem
                            key={vendorId}
                            value={vendorId}
                            className="mx-auto"
                            data-testid={`select-${line.id}-${vendorId}`}
                          />
                        );
                      })}
                    </RadioGroup>
                  </TableCell>
                </TableRow>
              ))}
              
              {/* Totals row */}
              <TableRow className="border-t-2 border-slate-300 bg-slate-50">
                <TableCell className="font-semibold text-slate-900 bg-slate-50 sticky left-0" colSpan={2}>
                  Totals
                </TableCell>
                {Object.keys(mockQuoteData.vendors).map((vendorId) => (
                  <TableCell key={vendorId} className="text-center font-semibold">
                    {formatCurrency(vendorTotals[vendorId] || 0)}
                  </TableCell>
                ))}
                <TableCell className="text-center">
                  <div className="font-semibold text-green-600">
                    {formatCurrency(selectedTotal)}
                  </div>
                  <div className="text-xs text-green-500 font-medium">
                    Save {formatCurrency(savings)}
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* Analysis Summary */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="text-sm font-medium text-green-800">Potential Savings</div>
            <div className="text-2xl font-bold text-green-900">{formatCurrency(savings)}</div>
            <div className="text-sm text-green-600">
              {((savings / Math.max(...Object.values(vendorTotals))) * 100).toFixed(1)}% vs highest quotes
            </div>
          </div>
          
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-sm font-medium text-blue-800">Avg Lead Time</div>
            <div className="text-2xl font-bold text-blue-900">4.3 days</div>
            <div className="text-sm text-blue-600">Range: 3-7 days</div>
          </div>
          
          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="text-sm font-medium text-purple-800">Selected Items</div>
            <div className="text-2xl font-bold text-purple-900">
              {Object.keys(selectedVendors).filter(k => selectedVendors[k]).length} of {mockQuoteData.lines.length}
            </div>
            <div className="text-sm text-purple-600">Ready for PO creation</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
