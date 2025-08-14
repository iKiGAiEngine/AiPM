import { useSearchParams, Link } from "react-router-dom";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BuyoutForm from "@/components/forms/BuyoutForm";
import type { Requisition } from "@shared/schema";

export default function NewBuyout() {
  const [searchParams] = useSearchParams();
  const requisitionId = searchParams.get('requisitionId');

  // Scroll to top when component loads
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Fetch requisition details if creating from a requisition
  const { data: requisition, isLoading } = useQuery<Requisition>({
    queryKey: ['/api/requisitions', requisitionId],
    queryFn: async () => {
      const response = await fetch(`/api/requisitions/${requisitionId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch requisition');
      return response.json();
    },
    enabled: !!requisitionId,
  });

  if (isLoading && requisitionId) {
    return (
      <div className="p-4 sm:p-6 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="h-32 bg-muted rounded"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6" id="buyout-top">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/rfqs">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to RFQs
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Create Buyout (RFQ)</h1>
          <p className="text-muted-foreground">
            {requisition 
              ? `Create competitive bidding for requisition ${requisition.number}`
              : "Request competitive quotes from multiple vendors"
            }
          </p>
        </div>
      </div>

      {/* Source Requisition Info */}
      {requisition && (
        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/50">
          <CardHeader>
            <CardTitle className="text-blue-700 dark:text-blue-300">Source Requisition</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <label className="font-medium text-blue-600 dark:text-blue-400">Number</label>
                <p className="font-mono">{requisition.number}</p>
              </div>
              <div>
                <label className="font-medium text-blue-600 dark:text-blue-400">Title</label>
                <p>{requisition.title}</p>
              </div>
              <div>
                <label className="font-medium text-blue-600 dark:text-blue-400">Zone</label>
                <p>{requisition.zone || 'N/A'}</p>
              </div>
              <div>
                <label className="font-medium text-blue-600 dark:text-blue-400">Status</label>
                <p className="capitalize font-medium">{requisition.status}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Buyout Form */}
      <BuyoutForm fromRequisition={requisition} />
    </div>
  );
}