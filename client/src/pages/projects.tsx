import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/use-auth";
import { Plus, Search, Eye, Edit, Building, Calendar, DollarSign, Users, MapPin, Briefcase } from "lucide-react";
import { format } from "date-fns";

export default function Projects() {
  const { currentOrganization } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: projects, isLoading } = useQuery({
    queryKey: [`/api/${currentOrganization?.id}/projects`],
    enabled: !!currentOrganization?.id,
  });

  const getStatusBadge = (isActive: boolean, startDate?: string, endDate?: string) => {
    if (!isActive) {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    
    const now = new Date();
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    
    if (start && now < start) {
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">Upcoming</Badge>;
    }
    
    if (end && now > end) {
      return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200">Completed</Badge>;
    }
    
    return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Active</Badge>;
  };

  const calculateProgress = (startDate?: string, endDate?: string) => {
    if (!startDate || !endDate) return 0;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();
    
    if (now < start) return 0;
    if (now > end) return 100;
    
    const total = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    
    return Math.round((elapsed / total) * 100);
  };

  const filteredProjects = projects?.filter((project: any) =>
    project.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.client?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.address?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
          <p className="text-slate-600">Project oversight and budget management</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-project">
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 p-4">
              <p className="text-muted-foreground">Project creation form would be implemented here with:</p>
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
                <li>Project name and client information</li>
                <li>Project address and site details</li>
                <li>Start and end dates</li>
                <li>Total budget allocation</li>
                <li>ERP system integration ID</li>
                <li>Project zones and cost codes setup</li>
                <li>Team member assignments</li>
                <li>Document attachments and specifications</li>
              </ul>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <CardTitle>All Projects</CardTitle>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-projects"
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
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-24 w-24 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Building className="h-12 w-12 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">No projects found</h3>
              <p className="text-slate-600 mb-6">
                {searchTerm ? "Try adjusting your search criteria" : "Create your first project to get started"}
              </p>
              {!searchTerm && (
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Project
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Timeline</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProjects.map((project: any) => (
                    <TableRow key={project.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell data-testid={`project-${project.id}`}>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                            <Building className="h-5 w-5 text-primary-600" />
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">{project.name}</div>
                            {project.description && (
                              <div className="text-sm text-slate-500 truncate max-w-xs">
                                {project.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell data-testid={`client-${project.id}`}>
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-slate-400" />
                          <span>{project.client || "N/A"}</span>
                        </div>
                      </TableCell>
                      <TableCell data-testid={`location-${project.id}`}>
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-slate-400" />
                          <span className="truncate max-w-xs">{project.address || "N/A"}</span>
                        </div>
                      </TableCell>
                      <TableCell data-testid={`budget-${project.id}`}>
                        <div className="flex items-center space-x-2">
                          <DollarSign className="h-4 w-4 text-slate-400" />
                          <span className="font-medium">
                            {project.totalBudget ? 
                              `$${parseFloat(project.totalBudget).toLocaleString()}` : 
                              "TBD"
                            }
                          </span>
                        </div>
                      </TableCell>
                      <TableCell data-testid={`timeline-${project.id}`}>
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2 text-sm">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            <span>
                              {project.startDate ? 
                                format(new Date(project.startDate), "MMM d, yyyy") : 
                                "TBD"
                              }
                            </span>
                          </div>
                          {project.endDate && (
                            <div className="text-sm text-slate-500">
                              → {format(new Date(project.endDate), "MMM d, yyyy")}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell data-testid={`progress-${project.id}`}>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                              {calculateProgress(project.startDate, project.endDate)}%
                            </span>
                          </div>
                          <Progress 
                            value={calculateProgress(project.startDate, project.endDate)} 
                            className="w-20 h-2"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(project.isActive, project.startDate, project.endDate)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            data-testid={`button-view-${project.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            data-testid={`button-edit-${project.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
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

      {/* Project Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {filteredProjects.filter((p: any) => p.isActive && 
                  (!p.endDate || new Date(p.endDate) > new Date())).length}
              </p>
              <p className="text-sm text-slate-600">Active Projects</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {filteredProjects.filter((p: any) => p.startDate && 
                  new Date(p.startDate) > new Date()).length}
              </p>
              <p className="text-sm text-slate-600">Upcoming</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-600">
                {filteredProjects.filter((p: any) => p.endDate && 
                  new Date(p.endDate) < new Date()).length}
              </p>
              <p className="text-sm text-slate-600">Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                ${filteredProjects.reduce((acc: number, p: any) => 
                  acc + parseFloat(p.totalBudget || 0), 0).toLocaleString()}
              </p>
              <p className="text-sm text-slate-600">Total Budget</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Projects */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Briefcase className="h-5 w-5" />
            <span>Recent Projects</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredProjects
              .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, 3)
              .map((project: any) => (
                <div key={project.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                      <Building className="h-6 w-6 text-primary-600" />
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">{project.name}</div>
                      <div className="text-sm text-slate-500">{project.client || "No client specified"}</div>
                      <div className="text-sm text-slate-500">
                        Created {format(new Date(project.createdAt), "MMM d, yyyy")}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-slate-900">
                      {project.totalBudget ? 
                        `$${parseFloat(project.totalBudget).toLocaleString()}` : 
                        "Budget TBD"
                      }
                    </div>
                    <div className="text-sm text-slate-500">
                      {calculateProgress(project.startDate, project.endDate)}% complete
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
