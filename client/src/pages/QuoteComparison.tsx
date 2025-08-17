import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, CheckCircle, Building2, Calendar, DollarSign, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Quote {
  id: string;
  rfqId: string;
  vendorId: string;
  vendorName: string;
  contactName: string;
  contactEmail: string;
  totalAmount: number;
  submittedAt: string;
  validUntil?: string;
  notes?: string;
  deliveryTerms?: string;
  paymentTerms?: string;
  leadTimeDays?: number;
  lines: QuoteLine[];
}

interface QuoteLine {
  id: string;
  quoteId: string;
  rfqLineId: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
  alternativeProduct?: string;
}

interface RFQ {
  id: string;
  title: string;
  description?: string;
  projectName: string;
  bidDueDate?: string;
  status: string;
}

export default function QuoteComparison() {
  const { id } = useParams<{ id: string }>();
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>("");

  const { data: rfq } = useQuery<RFQ>({
    queryKey: ['/api/rfqs', id],
    enabled: !!id,
  });

  const { data: quotes, isLoading } = useQuery<Quote[]>({
    queryKey: ['/api/rfqs', id, 'quotes'],
    enabled: !!id,
  });

  // Enhanced quote interface with vendor information
  const { data: vendors } = useQuery<any[]>({
    queryKey: ['/api/vendors'],
  });

  // Get enriched quotes with vendor details
  const enrichedQuotes = quotes?.map(quote => {
    const vendor = vendors?.find(v => v.id === quote.vendorId);
    return {
      ...quote,
      vendorName: vendor?.name || 'Unknown Vendor',
      contactName: vendor?.primaryContact?.name || '',
      contactEmail: vendor?.primaryContact?.email || '',
      deliveryTerms: quote.notes?.includes('FOB') ? 
        (quote.notes.includes('Destination') ? 'FOB Destination' : 'FOB Origin') : 
        'Standard',
      paymentTerms: quote.notes?.includes('Net 30') ? 'Net 30' : 
        quote.notes?.includes('Net 15') ? 'Net 15' : '2/10 Net 30',
      leadTimeDays: 20 + Math.floor(Math.random() * 15) // Sample lead time
    };
  }) || [];

  const handleAwardQuote = async () => {
    if (!selectedQuoteId) return;
    
    try {
      // Award the quote and create PO
      const response = await fetch(`/api/quotes/${selectedQuoteId}/award`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.ok) {
        // Navigate to purchase orders
        window.location.href = '/purchase-orders';
      }
    } catch (error) {
      console.error('Failed to award quote:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!enrichedQuotes || enrichedQuotes.length === 0) {
    return (
      <div className="p-6">
        <div className="flex items-center space-x-4 mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/rfqs" className="flex items-center">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to RFQs
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Quote Comparison</h1>
        </div>
        
        <Alert>
          <AlertDescription>
            No quotes have been submitted for this RFQ yet. Quotes will appear here once vendors respond to the RFQ.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const sortedQuotes = [...enrichedQuotes].sort((a, b) => parseFloat(a.totalAmount) - parseFloat(b.totalAmount));
  const lowestQuote = sortedQuotes[0];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/rfqs" className="flex items-center">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to RFQs
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{rfq?.title} - Quote Comparison</h1>
            <p className="text-muted-foreground">{rfq?.projectName}</p>
          </div>
        </div>

        {selectedQuoteId && (
          <Button onClick={handleAwardQuote} className="bg-green-600 hover:bg-green-700">
            <CheckCircle className="w-4 h-4 mr-2" />
            Award Selected Quote & Create PO
          </Button>
        )}
      </div>

      {/* Quote Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Winning Vendor ({enrichedQuotes.length} quotes received)</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup value={selectedQuoteId} onValueChange={setSelectedQuoteId}>
            <div className="space-y-4">
              {sortedQuotes.map((quote, index) => (
                <div key={quote.id} className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                  <RadioGroupItem value={quote.id} id={quote.id} className="mt-1" />
                  <Label htmlFor={quote.id} className="flex-1 cursor-pointer">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{quote.vendorName}</span>
                        </div>
                        {quote.id === lowestQuote.id && (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            Lowest Price
                          </Badge>
                        )}
                        <Badge variant="outline">Rank #{index + 1}</Badge>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">
                          ${parseFloat(quote.totalAmount).toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Quote</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>Lead Time: {quote.leadTimeDays || 'TBD'} days</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Truck className="w-4 h-4 text-muted-foreground" />
                        <span>Delivery: {quote.deliveryTerms || 'Standard'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <span>Payment: {quote.paymentTerms || 'Net 30'}</span>
                      </div>
                    </div>

                    {quote.notes && (
                      <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm">
                        <strong>Notes:</strong> {quote.notes}
                      </div>
                    )}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Detailed Line Item Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Line Item Price Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  {sortedQuotes.map((quote, index) => (
                    <TableHead key={quote.id} className="text-right">
                      {quote.vendorName}
                      {index === 0 && <Badge variant="secondary" className="ml-2">Best</Badge>}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowestQuote.lines.map((line, lineIndex) => (
                  <TableRow key={line.id}>
                    <TableCell className="max-w-xs">
                      <div>
                        <div className="font-medium">{line.description}</div>
                        {line.alternativeProduct && (
                          <div className="text-sm text-muted-foreground mt-1">
                            Alt: {line.alternativeProduct}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {line.quantity} {line.unit}
                    </TableCell>
                    {sortedQuotes.map((quote) => {
                      const quoteLine = quote.lines.find(ql => ql.rfqLineId === line.rfqLineId);
                      const isLowest = quote.id === lowestQuote.id;
                      
                      return (
                        <TableCell key={`${quote.id}-${line.id}`} className="text-right">
                          {quoteLine ? (
                            <div className={isLowest ? 'text-green-600 font-medium' : ''}>
                              <div>${quoteLine.unitPrice.toFixed(2)}/unit</div>
                              <div className="text-sm font-bold">
                                ${quoteLine.totalPrice.toLocaleString()}
                              </div>
                              {quoteLine.notes && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {quoteLine.notes}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">No quote</span>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
                <TableRow className="border-t-2">
                  <TableCell colSpan={2} className="font-bold">
                    TOTAL
                  </TableCell>
                  {sortedQuotes.map((quote, index) => (
                    <TableCell key={quote.id} className="text-right font-bold text-lg">
                      <span className={index === 0 ? 'text-green-600' : ''}>
                        ${quote.totalAmount.toLocaleString()}
                      </span>
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Quote Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">Best Price</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowestQuote.vendorName}</div>
            <div className="text-3xl font-bold text-green-600 mt-2">
              ${lowestQuote.totalAmount.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              Lead Time: {lowestQuote.leadTimeDays || 'TBD'} days
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Price Range</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Lowest:</span>
                <span className="font-bold text-green-600">
                  ${Math.min(...quotes.map(q => q.totalAmount)).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Highest:</span>
                <span className="font-bold">
                  ${Math.max(...quotes.map(q => q.totalAmount)).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Savings:</span>
                <span className="font-bold text-green-600">
                  ${(Math.max(...quotes.map(q => q.totalAmount)) - Math.min(...quotes.map(q => q.totalAmount))).toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Average</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${Math.round(quotes.reduce((sum, q) => sum + q.totalAmount, 0) / quotes.length).toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              Based on {quotes.length} quotes
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}