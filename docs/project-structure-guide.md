# BiteBase Project Structure Reorganization Guide

This guide outlines the process for reorganizing the BiteBase project structure to clearly separate frontend and backend concerns, making the codebase more maintainable and scalable.

## Table of Contents

- [Directory Structure](#directory-structure)
- [Function Separation](#function-separation)
- [Implementation Plan](#implementation-plan)
- [Best Practices](#best-practices)

## Directory Structure

### Current Structure (Before Reorganization)

```
/
├── src/
│   ├── agents/
│   ├── api/
│   ├── config/
│   ├── db/
│   ├── functions/
│   ├── middleware/
│   ├── monitoring/
│   ├── orchestration/
│   ├── services/
│   ├── utils/
│   └── workflows/
├── tests/
├── types/
└── public/
```

### Target Structure (After Reorganization)

```
/
├── src/                    # Source code root
│   ├── backend/            # Backend code
│   │   ├── api/            # API routes and controllers
│   │   │   ├── controllers/  # Business logic for API endpoints
│   │   │   └── routes/       # API route definitions
│   │   ├── db/             # Database services
│   │   ├── services/       # Business logic services
│   │   ├── utils/          # Backend utility functions
│   │   ├── middleware/     # Custom middleware
│   │   ├── agents/         # AI agent implementations
│   │   └── workflows/      # Workflow definitions
│   │
│   ├── frontend/           # Frontend code
│   │   ├── components/     # React components
│   │   │   ├── ui/         # UI components (buttons, inputs, etc.)
│   │   │   └── layout/     # Layout components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── contexts/       # React context providers
│   │   ├── pages/          # Next.js pages
│   │   ├── styles/         # CSS/styling
│   │   └── utils/          # Frontend utilities
│   │
│   └── shared/             # Shared code between backend and frontend
│       ├── types/          # TypeScript type definitions
│       ├── constants/      # Shared constants
│       └── utils/          # Shared utility functions
│
├── public/                 # Static assets
└── tests/                  # Tests directory
    ├── backend/            # Backend tests
    ├── frontend/           # Frontend tests
    └── integration/        # Integration tests
```

## Function Separation

### Backend Functions

The backend code should be organized by domain and functionality:

1. **API Controllers**: 
   - Responsible for handling HTTP requests
   - Implement business logic for API endpoints
   - Example: `src/backend/api/controllers/projectController.ts`

2. **Database Services**:
   - Handle database interactions
   - Implement CRUD operations
   - Example: `src/backend/db/projectRepository.ts`

3. **Services**:
   - Implement business logic
   - Orchestrate interactions between repositories and external services
   - Example: `src/backend/services/analysisService.ts`

4. **Agents**:
   - Implement AI agent functionality
   - Encapsulate LLM interactions
   - Example: `src/backend/agents/sentimentAgent.ts`

5. **Workflows**:
   - Define workflow processes
   - Orchestrate sequences of operations
   - Example: `src/backend/workflows/analysisWorkflow.ts`

### Frontend Functions

The frontend code should be organized by UI structure and functionality:

1. **Components**:
   - Reusable UI elements
   - Follow atomic design principles
   - Example: `src/frontend/components/ui/Button.tsx`

2. **Hooks**:
   - Custom React hooks for data fetching and state management
   - Example: `src/frontend/hooks/useProjects.ts`

3. **Contexts**:
   - React context providers for global state
   - Example: `src/frontend/contexts/AuthContext.tsx`

4. **Pages**:
   - Next.js page components
   - Example: `src/frontend/pages/projects/[id].tsx`

### Shared Functions

Code that's used by both backend and frontend:

1. **Types**:
   - TypeScript interfaces and types
   - Example: `src/shared/types/project.ts`

2. **Constants**:
   - Shared configuration values and constants
   - Example: `src/shared/constants/apiPaths.ts`

3. **Utilities**:
   - Helper functions used across the application
   - Example: `src/shared/utils/dateFormatters.ts`

## Implementation Plan

Follow these steps to reorganize the project:

### Step 1: Create the New Directory Structure

```bash
# Create backend directories
mkdir -p src/backend/api/controllers
mkdir -p src/backend/api/routes
mkdir -p src/backend/db
mkdir -p src/backend/services
mkdir -p src/backend/utils
mkdir -p src/backend/middleware
mkdir -p src/backend/agents
mkdir -p src/backend/workflows

# Create frontend directories
mkdir -p src/frontend/components/ui
mkdir -p src/frontend/components/layout
mkdir -p src/frontend/hooks
mkdir -p src/frontend/contexts
mkdir -p src/frontend/pages
mkdir -p src/frontend/styles
mkdir -p src/frontend/utils

# Create shared directories
mkdir -p src/shared/types
mkdir -p src/shared/constants
mkdir -p src/shared/utils

# Create test directories
mkdir -p tests/backend
mkdir -p tests/frontend
mkdir -p tests/integration
```

### Step 2: Move and Refactor Existing Files

#### Backend Files

1. **Agents**:
   ```bash
   mv src/agents/* src/backend/agents/
   ```

2. **Services**:
   ```bash
   mv src/services/* src/backend/services/
   ```

3. **DB**:
   ```bash
   mv src/db/* src/backend/db/
   ```

4. **Workflows**:
   ```bash
   mv src/workflows/* src/backend/workflows/
   ```

#### Update Imports

After moving files, update import paths in each file. For example:

Before:
```typescript
import { logger } from '../utils/logger';
```

After:
```typescript
import { logger } from '../../shared/utils/logger';
```

### Step 3: Implement Clean Architecture

For backend code, implement a clean architecture pattern:

#### Controllers

```typescript
// src/backend/api/controllers/projectController.ts
import { ProjectService } from '../../services/projectService';
import { Project, CreateProjectRequest } from '../../../shared/types/project';

export class ProjectController {
  constructor(private projectService: ProjectService) {}

  async getProjects(userId: string): Promise<Project[]> {
    return this.projectService.getProjectsByUser(userId);
  }

  async createProject(data: CreateProjectRequest): Promise<Project> {
    return this.projectService.createProject(data);
  }
}
```

#### Services

```typescript
// src/backend/services/projectService.ts
import { ProjectRepository } from '../db/projectRepository';
import { Project, CreateProjectRequest } from '../../shared/types/project';

export class ProjectService {
  constructor(private projectRepository: ProjectRepository) {}

  async getProjectsByUser(userId: string): Promise<Project[]> {
    return this.projectRepository.findByUserId(userId);
  }

  async createProject(data: CreateProjectRequest): Promise<Project> {
    // Add business logic here if needed
    return this.projectRepository.create(data);
  }
}
```

#### Repositories

```typescript
// src/backend/db/projectRepository.ts
import { D1Service } from './d1Service';
import { Project, CreateProjectRequest } from '../../shared/types/project';

export class ProjectRepository {
  constructor(private d1Service: D1Service) {}

  async findByUserId(userId: string): Promise<Project[]> {
    return this.d1Service.getProjectsByUser(userId);
  }

  async create(data: CreateProjectRequest): Promise<Project> {
    return this.d1Service.createProject(data);
  }
}
```

### Step 4: Implement Frontend Architecture

For frontend code, implement a component-based architecture:

#### React Hooks

```typescript
// src/frontend/hooks/useProjects.ts
import { useState, useEffect } from 'react';
import { Project } from '../../shared/types/project';
import { apiClient } from '../utils/apiClient';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchProjects() {
      try {
        setLoading(true);
        const response = await apiClient.get('/api/projects');
        setProjects(response.data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    }

    fetchProjects();
  }, []);

  return { projects, loading, error };
}
```

#### Components

```typescript
// src/frontend/components/projects/ProjectCard.tsx
import React from 'react';
import { Project } from '../../../shared/types/project';

interface ProjectCardProps {
  project: Project;
  onClick?: (project: Project) => void;
}

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  return (
    <div 
      className="card p-4 border rounded shadow-sm hover:shadow-md"
      onClick={() => onClick?.(project)}
    >
      <h3 className="text-lg font-semibold">{project.name}</h3>
      {project.description && (
        <p className="text-gray-600 mt-2">{project.description}</p>
      )}
      <p className="text-xs text-gray-400 mt-4">
        Created: {new Date(project.createdAt).toLocaleDateString()}
      </p>
    </div>
  );
}
```

## Best Practices

### 1. Use Dependency Injection

Implement dependency injection to make testing easier:

```typescript
// Factory function for creating controllers with dependencies
export function createProjectController() {
  const d1Service = new D1Service(globalThis.DB);
  const projectRepository = new ProjectRepository(d1Service);
  const projectService = new ProjectService(projectRepository);
  return new ProjectController(projectService);
}
```

### 2. Create Clear Interfaces

Define interfaces for all services to enable mocking in tests:

```typescript
// src/backend/services/interfaces/projectService.interface.ts
import { Project, CreateProjectRequest } from '../../../shared/types/project';

export interface IProjectService {
  getProjectsByUser(userId: string): Promise<Project[]>;
  createProject(data: CreateProjectRequest): Promise<Project>;
}
```

### 3. Separate API Routes from Business Logic

Keep API route handlers thin and delegate logic to controllers:

```typescript
// src/pages/api/projects/index.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { createProjectController } from '@/backend/api/controllers';
import { authMiddleware } from '@/backend/middleware/auth';

export default authMiddleware(async function handler(
  req: NextApiRequest, 
  res: NextApiResponse,
  session: any
) {
  const controller = createProjectController();

  if (req.method === 'GET') {
    const projects = await controller.getProjects(session.user.id);
    return res.status(200).json(projects);
  }

  if (req.method === 'POST') {
    // Validation logic
    const newProject = await controller.createProject({
      ...req.body,
      userId: session.user.id
    });
    return res.status(201).json(newProject);
  }

  return res.status(405).json({ error: `Method ${req.method} not allowed` });
});
```

### 4. Use Path Aliases

Configure path aliases in `tsconfig.json` for cleaner imports:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/backend/*": ["src/backend/*"],
      "@/frontend/*": ["src/frontend/*"],
      "@/shared/*": ["src/shared/*"]
    }
  }
}
```

### 5. Environmental Configuration

Create separate environment configuration files:

```typescript
// src/shared/config/environment.ts
export const config = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || '',
  firebase: {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || ''
  }
};
```

## Conclusion

Following this guide will help you reorganize your project structure to clearly separate frontend and backend concerns. This separation improves code maintainability, enhances team collaboration, and makes testing easier.

Remember to:
- Update imports after moving files
- Run tests after each significant change
- Document the new structure for the team
- Update CI/CD pipelines if necessary

For questions or improvements to this guide, please contact the development team. 