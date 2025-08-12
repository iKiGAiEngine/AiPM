import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Download, ShoppingCart, Clock, DollarSign } from "lucide-react";

interface QuoteLine {
  id: string;
  description: string;
  sku: string;
  quantity: number;
  vendors: {
    [vendorId: string]: {
      unitPrice: number;
      leadTime: string;
      total: number;
      available: boolean;
    };
  };
  selectedVendor: string;
}

interface Vendor {
  id: string;
  name: string;
}

// Mock data
const mockVendors: Vendor[] = [
  { id: 'abc', name: 'ABC Supply' },
  { id: 'bobrick', name: 'Bobrick Hardware' },
  { id: 'commercial', name: 'Commercial Fixtures' },
];

const mockQuoteLines: QuoteLine[] = [
  {
    id: '1',
    description: 'Paper Towel Dispenser',
    sku: 'BOB-2888-SS',
    quantity: 6,
    selectedVendor: 'bobrick',
    vendors: {
      abc: { unitPrice: 142.50, leadTime: '5-7 days', total: 855.00, available: true },
      bobrick: { unitPrice: 135.80, leadTime: '3-5 days', total: 814.80, available: true },
      commercial: { unitPrice: 148.75, leadTime: '7-10 days', total: 892.50, available: true },
    }
  },
  {
    id: '2',
    description: 'Grab Bar 36"',
    sku: 'BOB-B-4386',
    quantity: 12,
    selectedVendor: 'abc',
    vendors: {
      abc: { unitPrice: 89.25, leadTime: '5-7 days', total: 1071.00, available: true },
      bobrick: { unitPrice: 95.50, leadTime: '3-5 days', total: 1146.00, available: true },
      commercial: { unitPrice: 0, leadTime: '', total: 0, available: false },
    }
  },
  {
    id: '3',
    description: 'Toilet Seat Cover Dispenser',
    sku: 'BOB-B-221',
    quantity: 8,
    selectedVendor: 'bobrick',
    vendors: {
      abc: { unitPrice: 67.80, leadTime: '5-7 days', total: 542.40, available: true },
      bobrick: { unitPrice: 63.25, leadTime: '3-5 days', total: 506.00, available: true },
      commercial: { unitPrice: 71.50, leadTime: '7-10 days', total: 572.00, available: true },
    }
  }
];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
};

const getBestPriceVendor = (vendors: QuoteLine['vendors']) => {
  let bestVendor = '';
  let bestPrice = Infinity;
  
  Object.entries(vendors).forEach(([vendorId, quote]) => {
    if (quote.available && quote.unitPrice > 0 && quote.unitPrice < bestPrice) {
      bestPrice = quote.unitPrice;
      bestVendor = vendorId;
    }
  });
  
  return bestVendor;
};

export default function QuoteAnalysisMatrix() {
  const [lines, setLines] = useState<QuoteLine[]>(mockQuoteLines);

  const updateSelectedVendor = (lineId: string, vendorId: string) => {
    setLines(prev => prev.map(line => 
      line.id === lineId ? { ...line, selectedVendor: vendorId } : line
    ));
  };

  const calculateTotals = () => {
    const vendorTotals = mockVendors.reduce((acc, vendor) => {
      acc[vendor.id] = lines.reduce((sum, line) => {
        const quote = line.vendors[vendor.id];
        return sum + (quote?.available ? quote.total : 0);
      }, 0);
      return acc;
    }, {} as Record<string, number>);

    const selectedTotal = lines.reduce((sum, line) => {
      const selectedQuote = line.vendors[line.selectedVendor];
      return sum + (selectedQuote?.available ? selectedQuote.total : 0);
    }, 0);

    const highestTotal = Math.max(...Object.values(vendorTotals));
    const savings = highestTotal - selectedTotal;

    return { vendorTotals, selectedTotal, savings, highestTotal };
  };

  const { vendorTotals, selectedTotal, savings } = calculateTotals();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
        <div>
          <CardTitle>Quote Analysis: RFQ-2024-012</CardTitle>
          <p className="text-sm text-muted-foreground">Restroom Accessories - Zone B-3</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" size="sm" data-testid="button-export-csv">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button data-testid="button-convert-to-po">
            <ShoppingCart className="w-4 h-4 mr-2" />
            Convert Selected to PO
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {/* Quote Matrix Table */}
        <div className="overflow-x-auto mb-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-background">Material</TableHead>
                <TableHead className="text-center">Qty</TableHead>
                {mockVendors.map((vendor) => (
                  <TableHead key={vendor.id} className="text-center min-w-[120px]">
                    {vendor.name}
                  </TableHead>
                ))}
                <TableHead className="text-center">Selected</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => {
                const bestVendor = getBestPriceVendor(line.vendors);
                
                return (
                  <TableRow key={line.id}>
                    <TableCell className="sticky left-0 bg-background">
                      <div className="font-medium">{line.description}</div>
                      <div className="text-sm text-muted-foreground">{line.sku}</div>
                    </TableCell>
                    <TableCell className="text-center">{line.quantity}</TableCell>
                    {mockVendors.map((vendor) => {
                      const quote = line.vendors[vendor.id];
                      const isBestPrice = vendor.id === bestVendor;
                      
                      return (
                        <TableCell 
                          key={vendor.id} 
                          className={`text-center ${isBestPrice ? 'bg-green-50 dark:bg-green-900/20' : ''}`}
                        >
                          {quote.available ? (
                            <>
                              <div className={`font-medium ${isBestPrice ? 'text-green-700 dark:text-green-400' : ''}`}>
                                {formatCurrency(quote.unitPrice)}
                              </div>
                              <div className={`text-sm ${isBestPrice ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                                {quote.leadTime}
                              </div>
                              <div className={`text-xs ${isBestPrice ? 'text-green-500 font-medium' : 'text-muted-foreground'}`}>
                                Total: {formatCurrency(quote.total)}
                              </div>
                              {isBestPrice && (
                                <Badge variant="secondary" className="mt-1 bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                                  Best Price
                                </Badge>
                              )}
                            </>
                          ) : (
                            <div className="text-muted-foreground">No Quote</div>
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center">
                      <RadioGroup
                        value={line.selectedVendor}
                        onValueChange={(value) => updateSelectedVendor(line.id, value)}
                      >
                        {mockVendors.map((vendor) => {
                          const quote = line.vendors[vendor.id];
                          if (!quote.available) return null;
                          
                          return (
                            <div key={vendor.id} className="flex items-center space-x-2">
                              <RadioGroupItem value={vendor.id} id={`${line.id}-${vendor.id}`} />
                              <Label htmlFor={`${line.id}-${vendor.id}`} className="sr-only">
                                Select {vendor.name}
                              </Label>
                            </div>
                          );
                        })}
                      </RadioGroup>
                    </TableCell>
                  </TableRow>
                );
              })}
              
              {/* Totals Row */}
              <TableRow className="border-t-2 bg-muted/20">
                <TableCell className="sticky left-0 bg-muted/20 font-semibold" colSpan={2}>
                  Totals
                </TableCell>
                {mockVendors.map((vendor) => (
                  <TableCell key={vendor.id} className="text-center font-semibold">
                    {formatCurrency(vendorTotals[vendor.id])}
                  </TableCell>
                ))}
                <TableCell className="text-center">
                  <div className="font-semibold text-green-600 dark:text-green-400">
                    {formatCurrency(selectedTotal)}
                  </div>
                  {savings > 0 && (
                    <div className="text-xs text-green-500 font-medium">
                      Save {formatCurrency(savings)}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* Analysis Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                <div className="text-sm font-medium text-green-800 dark:text-green-200">Potential Savings</div>
              </div>
              <div className="text-2xl font-bold text-green-900 dark:text-green-100 mt-1">
                {formatCurrency(savings)}
              </div>
              <div className="text-sm text-green-600 dark:text-green-400">
                {savings > 0 ? `${((savings / (selectedTotal + savings)) * 100).toFixed(1)}% vs highest quotes` : 'Best possible pricing selected'}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div className="text-sm font-medium text-blue-800 dark:text-blue-200">Avg Lead Time</div>
              </div>
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                4.3 days
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-400">
                Range: 3-7 days
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <ShoppingCart className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <div className="text-sm font-medium text-purple-800 dark:text-purple-200">Selected Items</div>
              </div>
              <div className="text-2xl font-bold text-purple-900 dark:text-purple-100 mt-1">
                {lines.length} of {lines.length}
              </div>
              <div className="text-sm text-purple-600 dark:text-purple-400">
                Ready for PO creation
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
