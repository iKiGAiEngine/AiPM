import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ArrowLeft, 
  Building, 
  MapPin, 
  DollarSign, 
  Calendar,
  Tag,
  Eye,
  Edit,
  Upload,
  FileSpreadsheet,
  CheckCircle,
  Clock,
  AlertTriangle
} from "lucide-react";
import type { Project } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

const statusColors = {
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  on_hold: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

interface MaterialImportRun {
  id: string;
  sourceFilename: string;
  status: "pending" | "review" | "approved" | "rejected";
  rowCount: number;
  createdAt: string;
}

function PendingImportsCard({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  
  const { data: imports } = useQuery<MaterialImportRun[]>({
    queryKey: ['/api/projects', projectId, 'material-imports'],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/material-import/runs`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (!response.ok) return [];
      return response.json();
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (runId: string) => {
      const response = await fetch(`/api/material-imports/${runId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to approve import');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'material-imports'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'materials'] });
    },
  });

  const pendingImports = imports?.filter(imp => imp.status === 'review') || [];
  
  if (pendingImports.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5" />
          Pending Material Imports
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {pendingImports.map((importRun) => (
            <Alert key={importRun.id}>
              <Clock className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <div>
                  <strong>{importRun.sourceFilename}</strong> - {importRun.rowCount} materials uploaded
                  <div className="text-xs text-muted-foreground mt-1">
                    Uploaded {new Date(importRun.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => approveMutation.mutate(importRun.id)}
                    disabled={approveMutation.isPending}
                    data-testid={`button-approve-import-${importRun.id}`}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: project, isLoading, error } = useQuery<Project>({
    queryKey: ['/api/projects', id],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch project');
      return response.json();
    },
    enabled: !!id,
  });

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
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

  if (error || !project) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <Card>
          <CardContent className="p-6 text-center">
            <h2 className="text-lg font-semibold mb-2">Project Not Found</h2>
            <p className="text-muted-foreground mb-4">The project you're looking for doesn't exist or you don't have permission to view it.</p>
            <Button onClick={() => navigate("/projects")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Projects
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/projects")}
          data-testid="button-back-to-projects"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Projects
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
            <Badge className={statusColors[project.status as keyof typeof statusColors]}>
              {project.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">Project Details and Management</p>
        </div>
        <Button asChild data-testid="button-edit-project">
          <Link to={`/projects/${project.id}/edit`}>
            <Edit className="w-4 h-4 mr-2" />
            Edit Project
          </Link>
        </Button>
      </div>

      {/* Project Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              Project Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Project Name</label>
                <p className="text-sm font-medium">{project.name}</p>
              </div>
              
              {project.client && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Client</label>
                  <p className="text-sm">{project.client}</p>
                </div>
              )}
              
              {project.address && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Address</label>
                  <div className="flex items-start space-x-2">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <p className="text-sm">{project.address}</p>
                  </div>
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <div className="mt-1">
                  <Badge className={statusColors[project.status as keyof typeof statusColors]}>
                    {project.status}
                  </Badge>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Created</label>
                <p className="text-sm">
                  {project.createdAt ? formatDistanceToNow(new Date(project.createdAt), { addSuffix: true }) : 'Recently'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Budget Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Budget Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Total Budget</label>
                <p className="text-2xl font-bold">
                  {project.budget ? formatCurrency(project.budget) : 'Not set'}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Spent</label>
                  <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                    {formatCurrency(0)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Remaining</label>
                  <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                    {project.budget ? formatCurrency(project.budget) : formatCurrency(0)}
                  </p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Budget Utilization</label>
                <div className="mt-2">
                  <div className="bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary rounded-full h-2 transition-all duration-300" 
                      style={{ width: '0%' }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">0% utilized</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost Codes */}
      {project.costCodes && project.costCodes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5" />
              Cost Codes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {project.costCodes.map((code, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {code}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Material Imports Status */}
      <PendingImportsCard projectId={project.id} />

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-center space-y-2"
              onClick={() => navigate(`/requisitions?projectId=${project.id}`)}
              data-testid="button-view-requisitions"
            >
              <Eye className="w-6 h-6" />
              <span className="text-sm">View Requisitions</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-center space-y-2"
              onClick={() => navigate(`/rfqs?projectId=${project.id}`)}
              data-testid="button-view-rfqs"
            >
              <Building className="w-6 h-6" />
              <span className="text-sm">View RFQs</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-center space-y-2"
              onClick={() => navigate(`/purchase-orders?projectId=${project.id}`)}
              data-testid="button-view-purchase-orders"
            >
              <DollarSign className="w-6 h-6" />
              <span className="text-sm">Purchase Orders</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-center space-y-2"
              onClick={() => navigate(`/deliveries?projectId=${project.id}`)}
              data-testid="button-view-deliveries"
            >
              <Calendar className="w-6 h-6" />
              <span className="text-sm">Deliveries</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-center space-y-2"
              onClick={() => navigate(`/projects/${project.id}/materials/upload`)}
              data-testid="button-upload-materials"
            >
              <Upload className="w-6 h-6" />
              <span className="text-sm">Upload Materials</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}