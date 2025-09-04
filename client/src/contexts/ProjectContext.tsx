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
    retry: 1, // Reduce retries to avoid spam
  });
  

  // Default to "All Projects" (null) and allow user to restore saved selection
  useEffect(() => {
    if (!selectedProject && projects.length > 0) {
      // Try to restore from localStorage first
      const savedProjectId = localStorage.getItem('selectedProjectId');
      if (savedProjectId && savedProjectId !== 'all') {
        const savedProject = projects.find(p => p.id === savedProjectId);
        if (savedProject) {
          setSelectedProject(savedProject);
          return;
        }
      }
      
      // Default to "All Projects" (null) for quick overview access
      setSelectedProject(null);
    }
  }, [projects, selectedProject]);

  // Save selected project to localStorage
  useEffect(() => {
    if (selectedProject) {
      localStorage.setItem('selectedProjectId', selectedProject.id);
    } else {
      // Store 'all' when no specific project is selected
      localStorage.setItem('selectedProjectId', 'all');
    }
  }, [selectedProject]);

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