import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { RFQForm } from "@/components/forms/rfq-form";
import { Plus, Search, Eye, Send, Calendar, FileText } from "lucide-react";
import { format } from "date-fns";

export default function RFQs() {
  const { currentOrganization } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: rfqs, isLoading } = useQuery({
    queryKey: [`/api/${currentOrganization?.id}/rfqs`],
    enabled: !!currentOrganization?.id,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "sent":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">Sent</Badge>;
      case "responses_received":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Responses Received</Badge>;
      case "analyzed":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Analyzed</Badge>;
      case "converted":
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200">Converted to PO</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredRFQs = rfqs?.filter((rfq: any) =>
    rfq.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rfq.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rfq.project?.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">RFQs & Quotes</h1>
          <p className="text-slate-600">Request quotes from vendors and analyze responses</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-rfq">
              <Plus className="mr-2 h-4 w-4" />
              New RFQ
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New RFQ</DialogTitle>
            </DialogHeader>
            <RFQForm onSuccess={() => setIsCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <CardTitle>All RFQs</CardTitle>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search RFQs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-rfqs"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          ) : filteredRFQs.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-24 w-24 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <FileText className="h-12 w-12 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">No RFQs found</h3>
              <p className="text-slate-600 mb-6">
                {searchTerm ? "Try adjusting your search criteria" : "Get started by creating your first RFQ"}
              </p>
              {!searchTerm && (
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create RFQ
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>RFQ #</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Creator</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRFQs.map((rfq: any) => (
                    <TableRow key={rfq.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell className="font-medium" data-testid={`rfq-${rfq.number}`}>
                        {rfq.number}
                      </TableCell>
                      <TableCell data-testid={`title-${rfq.id}`}>
                        {rfq.title}
                      </TableCell>
                      <TableCell data-testid={`project-${rfq.id}`}>
                        {rfq.project?.name || "N/A"}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(rfq.status)}
                      </TableCell>
                      <TableCell data-testid={`sent-date-${rfq.id}`}>
                        {rfq.sentAt ? 
                          format(new Date(rfq.sentAt), "MMM d, yyyy") : 
                          "-"
                        }
                      </TableCell>
                      <TableCell data-testid={`due-date-${rfq.id}`}>
                        {rfq.bidDueDate ? 
                          format(new Date(rfq.bidDueDate), "MMM d, yyyy") : 
                          "TBD"
                        }
                      </TableCell>
                      <TableCell data-testid={`creator-${rfq.id}`}>
                        {rfq.creator ? 
                          `${rfq.creator.firstName} ${rfq.creator.lastName}` : 
                          "N/A"
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            data-testid={`button-view-${rfq.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {rfq.status === 'draft' && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              data-testid={`button-send-${rfq.id}`}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900">
                {filteredRFQs.filter((r: any) => r.status === 'draft').length}
              </p>
              <p className="text-sm text-slate-600">Draft</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {filteredRFQs.filter((r: any) => r.status === 'sent').length}
              </p>
              <p className="text-sm text-slate-600">Sent</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {filteredRFQs.filter((r: any) => r.status === 'responses_received').length}
              </p>
              <p className="text-sm text-slate-600">Responses</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {filteredRFQs.filter((r: any) => r.status === 'analyzed').length}
              </p>
              <p className="text-sm text-slate-600">Analyzed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                {filteredRFQs.filter((r: any) => r.status === 'converted').length}
              </p>
              <p className="text-sm text-slate-600">Converted</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
