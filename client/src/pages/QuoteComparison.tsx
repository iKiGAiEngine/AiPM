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
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Quote {
  id: string;
  rfqId: string;
  vendorId: string;
  totalAmount: string;
  quotedAt: string;
  validUntil?: string;
  notes?: string;
  lines: QuoteLine[];
}

interface QuoteLine {
  id: string;
  quoteId: string;
  rfqLineId: string;
  unitPrice: string;
  lineTotal: string;
  leadTimeDays?: number;
  alternateDescription?: string;
}

interface RFQ {
  id: string;
  title: string;
  description?: string;
  projectName?: string;
  bidDueDate?: string;
  status: string;
}

interface Vendor {
  id: string;
  name: string;
  primaryContact?: {
    name?: string;
    email?: string;
  };
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

  const { data: vendors } = useQuery<Vendor[]>({
    queryKey: ['/api/vendors'],
  });

  const handleAwardQuote = async () => {
    if (!selectedQuoteId) return;
    
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        alert('Authentication required. Please log in again.');
        window.location.href = '/login';
        return;
      }

      const response = await fetch(`/api/quotes/${selectedQuoteId}/award`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Success! Purchase Order ${result.poNumber} created. Navigating to Purchase Orders...`);
        window.location.href = '/purchase-orders';
      } else {
        const error = await response.json();
        alert(`Failed to award quote: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to award quote:', error);
      alert('Failed to award quote. Please try again.');
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

  if (!quotes || quotes.length === 0) {
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

  // Process quotes with vendor information
  const enrichedQuotes = quotes.map(quote => {
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
      leadTimeDays: 20 + Math.floor(Math.random() * 15), // Sample lead time
      totalAmountNumber: parseFloat(quote.totalAmount)
    };
  });

  const sortedQuotes = [...enrichedQuotes].sort((a, b) => a.totalAmountNumber - b.totalAmountNumber);
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
          <CardTitle>Select Winning Vendor ({sortedQuotes.length} quotes received)</CardTitle>
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
                        {index === 0 && (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            Lowest Price
                          </Badge>
                        )}
                        <Badge variant="outline">Rank #{index + 1}</Badge>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">
                          ${quote.totalAmountNumber.toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Quote</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>Lead Time: {quote.leadTimeDays} days</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Truck className="w-4 h-4 text-muted-foreground" />
                        <span>Delivery: {quote.deliveryTerms}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <span>Payment: {quote.paymentTerms}</span>
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

      {/* Quote Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">Best Price</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowestQuote.vendorName}</div>
            <div className="text-3xl font-bold text-green-600 mt-2">
              ${lowestQuote.totalAmountNumber.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              Lead Time: {lowestQuote.leadTimeDays} days
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
                  ${Math.min(...sortedQuotes.map(q => q.totalAmountNumber)).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Highest:</span>
                <span className="font-bold">
                  ${Math.max(...sortedQuotes.map(q => q.totalAmountNumber)).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Savings:</span>
                <span className="font-bold text-green-600">
                  ${(Math.max(...sortedQuotes.map(q => q.totalAmountNumber)) - Math.min(...sortedQuotes.map(q => q.totalAmountNumber))).toLocaleString()}
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
              ${Math.round(sortedQuotes.reduce((sum, q) => sum + q.totalAmountNumber, 0) / sortedQuotes.length).toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              Based on {sortedQuotes.length} quotes
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Simple Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Quote Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sortedQuotes.map((quote, index) => (
              <div key={quote.id} className="flex justify-between items-center p-2 border-b">
                <div className="flex items-center space-x-2">
                  <Badge variant={index === 0 ? "default" : "outline"}>#{index + 1}</Badge>
                  <span className="font-medium">{quote.vendorName}</span>
                </div>
                <div className={`text-lg font-bold ${index === 0 ? 'text-green-600' : ''}`}>
                  ${quote.totalAmountNumber.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}