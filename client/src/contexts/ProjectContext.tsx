import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
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

  // Fetch all projects for the user's organization - only when authenticated
  const { data: projects = [], isLoading: isLoadingProjects } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
    queryFn: async () => {
      const response = await fetch('/api/projects', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch projects');
      return response.json();
    },
    enabled: isAuthenticated && !!user, // Only fetch when authenticated and user is loaded
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