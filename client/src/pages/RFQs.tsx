import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Eye, Send, FileText } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import type { RFQ } from "@shared/schema";

const statusColors = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  quoted: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  closed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

export default function RFQs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: rfqs = [], isLoading, error } = useQuery<RFQ[]>({
    queryKey: ['/api/rfqs'],
    queryFn: async () => {
      const response = await fetch('/api/rfqs', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch RFQs');
      return response.json();
    },
  });

  const filteredRFQs = rfqs.filter((rfq) => {
    const matchesSearch = rfq.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         rfq.number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || rfq.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <Send className="w-4 h-4" />;
      case 'quoted':
        return <FileText className="w-4 h-4" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="h-32 bg-muted rounded"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <Card className="border-destructive">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-destructive">Failed to load RFQs</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Buyouts (RFQs)</h1>
          <p className="text-muted-foreground">Competitive bidding and vendor quote management</p>
        </div>
        <Button asChild data-testid="button-new-rfq">
          <Link to="/rfqs/new">
            <Plus className="w-4 h-4 mr-2" />
            New Buyout
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search RFQs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="quoted">Quoted</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* RFQs Table */}
      <Card>
        <CardContent className="p-0">
          {filteredRFQs.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground">
                {searchQuery || statusFilter !== "all" ? (
                  <p>No RFQs match your filters</p>
                ) : (
                  <p>No RFQs yet. Create your first RFQ to get quotes from vendors.</p>
                )}
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>RFQ Number</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Bid Due Date</TableHead>
                  <TableHead>Vendors</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRFQs.map((rfq) => (
                  <TableRow key={rfq.id} className="cursor-pointer hover:bg-muted/50" data-testid={`rfq-row-${rfq.id}`}>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(rfq.status || '')}
                        <span data-testid={`rfq-number-${rfq.id}`}>{rfq.number}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate" data-testid={`rfq-title-${rfq.id}`}>
                        {rfq.title}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm" data-testid={`rfq-due-date-${rfq.id}`}>
                        {rfq.bidDueDate ? format(new Date(rfq.bidDueDate), 'MMM dd, yyyy') : 'Not set'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground" data-testid={`rfq-vendors-${rfq.id}`}>
                        {rfq.vendorIds ? `${rfq.vendorIds.length} vendors` : '0 vendors'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[rfq.status as keyof typeof statusColors]} data-testid={`rfq-status-${rfq.id}`}>
                        {rfq.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <span data-testid={`rfq-created-${rfq.id}`}>
                        {rfq.createdAt ? formatDistanceToNow(new Date(rfq.createdAt), { addSuffix: true }) : 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {rfq.status === 'quoted' && (
                          <Button variant="ghost" size="sm" asChild data-testid={`button-view-quotes-${rfq.id}`}>
                            <Link to={`/rfqs/${rfq.id}/quotes`}>
                              <FileText className="w-4 h-4" />
                            </Link>
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" asChild data-testid={`button-view-rfq-${rfq.id}`}>
                          <Link to={`/rfqs/${rfq.id}`}>
                            <Eye className="w-4 h-4" />
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
