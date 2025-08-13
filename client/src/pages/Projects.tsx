import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Eye, FolderOpen, Building, MapPin, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Project } from "@shared/schema";

const statusColors = {
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  on_hold: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

interface ProjectWithStats extends Project {
  // Mock additional data that would come from aggregated queries
  spent?: number;
  commitments?: number;
  remainingBudget?: number;
  completionPercentage?: number;
}

export default function Projects() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: projects = [], isLoading, error } = useQuery<ProjectWithStats[]>({
    queryKey: ['/api/projects'],
    queryFn: async () => {
      const response = await fetch('/api/projects', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch projects');
      const projectsData = await response.json();
      
      // Return projects without mock spending data
      return projectsData.map((project: Project) => ({
        ...project,
        spent: 0, // Will be calculated from actual requisitions/POs
        commitments: 0, // Will be calculated from active POs
        completionPercentage: 0, // Will be calculated from delivery status
      }));
    },
  });

  const filteredProjects = projects.filter((project) => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (project.client?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "all" || project.status === statusFilter;
    return matchesSearch && matchesStatus;
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

  if (error) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <Card className="border-destructive">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-destructive">Failed to load projects</p>
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
          <h1 className="text-2xl font-bold text-foreground">Projects</h1>
          <p className="text-muted-foreground">Manage construction projects and budget tracking</p>
        </div>
        <Button asChild data-testid="button-new-project">
          <Link to="/projects/new">
            <Plus className="w-4 h-4 mr-2" />
            New Project
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
                  placeholder="Search projects..."
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
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredProjects.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <div className="text-muted-foreground">
              {searchQuery || statusFilter !== "all" ? (
                <p>No projects match your filters</p>
              ) : (
                <p>No projects yet. Create your first project to get started.</p>
              )}
            </div>
          </div>
        ) : (
          filteredProjects.map((project) => {
            const budget = parseFloat(project.budget || '0');
            const spent = project.spent || 0;
            const commitments = project.commitments || 0;
            const remaining = budget - spent - commitments;
            const spentPercentage = budget > 0 ? (spent / budget) * 100 : 0;
            const variance = remaining;
            
            return (
              <Card key={project.id} className="hover:shadow-md transition-shadow" data-testid={`project-card-${project.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FolderOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate" data-testid={`project-name-${project.id}`}>
                          {project.name}
                        </CardTitle>
                        {project.client && (
                          <p className="text-sm text-muted-foreground truncate" data-testid={`project-client-${project.id}`}>
                            <Building className="w-3 h-3 inline mr-1" />
                            {project.client}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge className={statusColors[project.status as keyof typeof statusColors]} data-testid={`project-status-${project.id}`}>
                      {project.status}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Project Details */}
                  {project.address && (
                    <div className="flex items-start space-x-2 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground text-xs leading-relaxed" data-testid={`project-address-${project.id}`}>
                        {project.address}
                      </span>
                    </div>
                  )}

                  {/* Budget Overview */}
                  {project.budget && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-foreground flex items-center">
                          <DollarSign className="w-4 h-4 mr-1" />
                          Budget Overview
                        </h4>
                        <span className="text-sm text-muted-foreground" data-testid={`project-completion-${project.id}`}>
                          {project.completionPercentage || 0}% complete
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">Budget</div>
                          <div className="font-medium" data-testid={`project-budget-${project.id}`}>
                            {formatCurrency(budget)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">Spent</div>
                          <div className="font-medium" data-testid={`project-spent-${project.id}`}>
                            {formatCurrency(spent)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">Remaining</div>
                          <div className={`font-medium ${variance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} data-testid={`project-remaining-${project.id}`}>
                            {formatCurrency(remaining)}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Progress value={spentPercentage} className="h-2" />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{spentPercentage.toFixed(1)}% spent</span>
                          <span className={`flex items-center ${variance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {variance >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                            {variance >= 0 ? 'Under budget' : 'Over budget'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Cost Codes */}
                  {project.costCodes && project.costCodes.length > 0 && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-2">Cost Codes:</div>
                      <div className="flex flex-wrap gap-1">
                        {project.costCodes.slice(0, 3).map((code) => (
                          <Badge key={code} variant="outline" className="text-xs">
                            {code}
                          </Badge>
                        ))}
                        {project.costCodes.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{project.costCodes.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-3 border-t border-border">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        Created {project.createdAt ? formatDistanceToNow(new Date(project.createdAt), { addSuffix: true }) : 'recently'}
                      </div>
                      <Button variant="ghost" size="sm" asChild data-testid={`button-view-project-${project.id}`}>
                        <Link to={`/projects/${project.id}`}>
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
