import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import type { Project } from '@shared/schema';

interface ProjectContextType {
  selectedProject: Project | null;
  setSelectedProject: (project: Project | null) => void;
  projects: Project[];
  isLoadingProjects: boolean;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}

interface ProjectProviderProps {
  children: ReactNode;
}

export function ProjectProvider({ children }: ProjectProviderProps) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();

  // Debug logging for projects state
  console.log('ProjectContext - Auth state:', { isAuthenticated, hasUser: !!user, authTime: Date.now() });
  
  // Force refetch when authentication state changes
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('ProjectContext - Authentication completed, invalidating projects query');
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      // Also trigger immediate refetch to ensure data loads
      queryClient.refetchQueries({ queryKey: ['/api/projects'] });
    }
  }, [isAuthenticated, user, queryClient]);

  // Fetch all projects for the user's organization - only when authenticated
  const { data: projects = [], isLoading: isLoadingProjects } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
    queryFn: async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No authentication token');
      }
      
      const response = await fetch('/api/projects', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        throw new Error('Authentication failed');
      }
      
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      
      const data = await response.json();
      console.log('ProjectContext - Projects fetched:', data.length, 'projects');
      return data;
    },
    enabled: isAuthenticated && !!user, // Only fetch when authenticated and user is loaded
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: false, // Don't refetch on window focus
    staleTime: 0, // Override global staleTime for this query
    retry: 3, // Allow more retries for better reliability
    refetchOnReconnect: true, // Refetch when reconnected
  });
  

  // Handle project selection - allow access when no projects exist
  useEffect(() => {
    if (projects.length === 0) {
      // Clear project selection when no projects exist
      setSelectedProject(null);
      localStorage.removeItem('selectedProjectId');
    } else if (!selectedProject && projects.length > 0) {
      // Try to restore from localStorage first
      const savedProjectId = localStorage.getItem('selectedProjectId');
      if (savedProjectId && savedProjectId !== 'all') {
        const savedProject = projects.find(p => p.id === savedProjectId);
        if (savedProject) {
          setSelectedProject(savedProject);
          return;
        }
      }
      
      // Auto-select first available project
      setSelectedProject(projects[0]);
    }
  }, [projects, selectedProject]);

  // Save selected project to localStorage
  useEffect(() => {
    if (selectedProject) {
      localStorage.setItem('selectedProjectId', selectedProject.id);
    } else if (projects.length === 0) {
      // Remove project selection when no projects exist
      localStorage.removeItem('selectedProjectId');
    }
  }, [selectedProject, projects.length]);

  const value = {
    selectedProject,
    setSelectedProject,
    projects,
    isLoadingProjects,
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}