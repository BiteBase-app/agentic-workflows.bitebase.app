# BiteBase API Endpoint Development Guide

This guide provides standards and best practices for creating and updating API endpoints in the BiteBase platform.

## Table of Contents

- [API Structure](#api-structure)
- [Creating New Endpoints](#creating-new-endpoints)
- [Authentication & Authorization](#authentication--authorization)
- [Error Handling](#error-handling)
- [Request Validation](#request-validation)
- [Response Formatting](#response-formatting)
- [Examples](#examples)

## API Structure

Our API follows a RESTful architecture with the following structure:

```
/api/[resource]/           # Resource collection (GET, POST)
/api/[resource]/[id]       # Specific resource (GET, PUT, DELETE)
/api/[resource]/[id]/[sub] # Sub-resource collection
```

### Resource Naming Conventions

- Use **plural nouns** for resources: `/api/projects`, `/api/users`
- Use **kebab-case** for multi-word resources: `/api/project-analyses`
- Keep URLs **lowercase**

## Creating New Endpoints

### Step 1: Define Types

First, define your data types in the shared types directory:

```typescript
// src/shared/types/project.ts
export interface Project {
  id: string;
  name: string;
  description?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateProjectRequest = Omit<Project, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateProjectRequest = Partial<Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>;
```

### Step 2: Create Controller

Implement the business logic in a controller:

```typescript
// src/backend/api/controllers/projectController.ts
import { Project, CreateProjectRequest, UpdateProjectRequest } from '@/shared/types/project';
import { DBService } from '@/backend/db/dbService';

export class ProjectController {
  constructor(private dbService: DBService) {}

  async getProjects(userId: string): Promise<Project[]> {
    return this.dbService.getProjectsByUser(userId);
  }

  async getProject(id: string, userId: string): Promise<Project | null> {
    const project = await this.dbService.getProject(id);
    if (!project || project.userId !== userId) {
      return null;
    }
    return project;
  }

  async createProject(data: CreateProjectRequest): Promise<Project> {
    return this.dbService.createProject(data);
  }

  async updateProject(id: string, data: UpdateProjectRequest, userId: string): Promise<Project | null> {
    const project = await this.dbService.getProject(id);
    if (!project || project.userId !== userId) {
      return null;
    }
    return this.dbService.updateProject(id, data);
  }

  async deleteProject(id: string, userId: string): Promise<boolean> {
    const project = await this.dbService.getProject(id);
    if (!project || project.userId !== userId) {
      return false;
    }
    return this.dbService.deleteProject(id);
  }
}
```

### Step 3: Create Route Handler

Implement the API routes using Next.js API routes:

```typescript
// src/pages/api/projects/index.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { ProjectController } from '@/backend/api/controllers/projectController';
import { DBService } from '@/backend/db/dbService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const dbService = new DBService();
  const projectController = new ProjectController(dbService);

  // GET /api/projects - List all projects for the user
  if (req.method === 'GET') {
    try {
      const projects = await projectController.getProjects(session.user.id);
      return res.status(200).json(projects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      return res.status(500).json({ error: 'Failed to fetch projects' });
    }
  }

  // POST /api/projects - Create a new project
  if (req.method === 'POST') {
    try {
      const data = req.body;
      
      // Validate required fields
      if (!data.name) {
        return res.status(400).json({ error: 'Name is required' });
      }

      const newProject = await projectController.createProject({
        name: data.name,
        description: data.description || '',
        userId: session.user.id
      });

      return res.status(201).json(newProject);
    } catch (error) {
      console.error('Error creating project:', error);
      return res.status(500).json({ error: 'Failed to create project' });
    }
  }

  // Method not allowed
  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}
```

For specific resource routes:

```typescript
// src/pages/api/projects/[id].ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { ProjectController } from '@/backend/api/controllers/projectController';
import { DBService } from '@/backend/db/dbService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid project ID' });
  }

  const dbService = new DBService();
  const projectController = new ProjectController(dbService);

  // GET /api/projects/[id] - Get a specific project
  if (req.method === 'GET') {
    try {
      const project = await projectController.getProject(id, session.user.id);
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      return res.status(200).json(project);
    } catch (error) {
      console.error('Error fetching project:', error);
      return res.status(500).json({ error: 'Failed to fetch project' });
    }
  }

  // PUT /api/projects/[id] - Update a project
  if (req.method === 'PUT') {
    try {
      const data = req.body;
      const updatedProject = await projectController.updateProject(id, data, session.user.id);
      
      if (!updatedProject) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      return res.status(200).json(updatedProject);
    } catch (error) {
      console.error('Error updating project:', error);
      return res.status(500).json({ error: 'Failed to update project' });
    }
  }

  // DELETE /api/projects/[id] - Delete a project
  if (req.method === 'DELETE') {
    try {
      const success = await projectController.deleteProject(id, session.user.id);
      
      if (!success) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting project:', error);
      return res.status(500).json({ error: 'Failed to delete project' });
    }
  }

  // Method not allowed
  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}
```

## Authentication & Authorization

All API routes should implement authentication checks to ensure they're only accessible to authenticated users. We use NextAuth.js for authentication.

### Authentication Check

```typescript
const session = await getServerSession(req, res, authOptions);
if (!session) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

### Authorization Check

For resource-specific endpoints, validate that the user has permission to access the resource:

```typescript
const project = await dbService.getProject(id);
if (!project) {
  return res.status(404).json({ error: 'Project not found' });
}

// Check if the user owns this project
if (project.userId !== session.user.id) {
  return res.status(403).json({ error: 'Forbidden: You do not have access to this resource' });
}
```

## Error Handling

Implement consistent error handling across all API endpoints:

### HTTP Status Codes

- `200` - OK: Request succeeded
- `201` - Created: Resource created successfully
- `400` - Bad Request: Invalid input
- `401` - Unauthorized: Authentication required
- `403` - Forbidden: User doesn't have permission
- `404` - Not Found: Resource doesn't exist
- `405` - Method Not Allowed: HTTP method not supported
- `409` - Conflict: Resource already exists or state conflict
- `422` - Unprocessable Entity: Validation failed
- `500` - Internal Server Error: Unexpected server error

### Error Response Format

```typescript
{
  error: string, // User-friendly error message
  details?: any, // Optional: Additional error details (for development)
  code?: string  // Optional: Error code for client-side handling
}
```

## Request Validation

Use Zod for request validation:

```typescript
import { z } from 'zod';

const createProjectSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }).max(100),
  description: z.string().optional(),
});

// Validate request body
const result = createProjectSchema.safeParse(req.body);
if (!result.success) {
  return res.status(422).json({ 
    error: 'Validation failed', 
    details: result.error.format() 
  });
}

// Use validated data
const validatedData = result.data;
```

## Response Formatting

Maintain consistent response formats:

### Collection Responses

```typescript
// GET /api/projects
{
  data: Project[],
  pagination?: {
    total: number,
    page: number,
    pageSize: number,
    hasMore: boolean
  }
}
```

### Single Resource Responses

```typescript
// GET /api/projects/123
{
  id: "123",
  name: "Project Name",
  description: "Project description",
  // ... other properties
}
```

### Success Responses

```typescript
// DELETE /api/projects/123
{
  success: true,
  message?: string
}
```

## Examples

### Complete Example: User Endpoints

Here's a complete example of implementing user endpoints:

#### 1. Define Types

```typescript
// src/shared/types/user.ts
export interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export type UpdateUserRequest = Partial<Omit<User, 'id' | 'email' | 'createdAt' | 'updatedAt'>>;
```

#### 2. Create Controller

```typescript
// src/backend/api/controllers/userController.ts
import { User, UpdateUserRequest } from '@/shared/types/user';
import { DBService } from '@/backend/db/dbService';

export class UserController {
  constructor(private dbService: DBService) {}

  async getUser(id: string): Promise<User | null> {
    return this.dbService.getUser(id);
  }

  async updateUser(id: string, data: UpdateUserRequest): Promise<User | null> {
    const user = await this.dbService.getUser(id);
    if (!user) {
      return null;
    }
    return this.dbService.updateUser(id, data);
  }
}
```

#### 3. Implement API Routes

```typescript
// src/pages/api/users/[id].ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { UserController } from '@/backend/api/controllers/userController';
import { DBService } from '@/backend/db/dbService';
import { z } from 'zod';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  // Ensure users can only access their own data
  if (id !== session.user.id) {
    return res.status(403).json({ error: 'Forbidden: You can only access your own user data' });
  }

  const dbService = new DBService();
  const userController = new UserController(dbService);

  // GET /api/users/[id] - Get user profile
  if (req.method === 'GET') {
    try {
      const user = await userController.getUser(id);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      return res.status(200).json(user);
    } catch (error) {
      console.error('Error fetching user:', error);
      return res.status(500).json({ error: 'Failed to fetch user' });
    }
  }

  // PUT /api/users/[id] - Update user profile
  if (req.method === 'PUT') {
    try {
      // Validate request body
      const updateUserSchema = z.object({
        name: z.string().optional(),
        image: z.string().url().optional(),
        onboardingCompleted: z.boolean().optional()
      });
      
      const result = updateUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(422).json({ 
          error: 'Validation failed', 
          details: result.error.format() 
        });
      }

      const updatedUser = await userController.updateUser(id, result.data);
      
      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      return res.status(200).json(updatedUser);
    } catch (error) {
      console.error('Error updating user:', error);
      return res.status(500).json({ error: 'Failed to update user' });
    }
  }

  // Method not allowed
  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}
```

### Cloudflare D1 Integration

For Cloudflare D1 integration, here's how to structure API routes:

```typescript
// app/api/projects/route.ts (Next.js App Router)
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { D1Service } from '@/lib/db/d1-service';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // If we have access to D1, use it
    if (process.env.CLOUDFLARE_WORKER && globalThis.DB) {
      const d1Service = new D1Service(globalThis.DB);
      const projects = await d1Service.getProjectsByUser(session.user.id);
      return NextResponse.json(projects);
    }

    // Fallback with mock data for development
    return NextResponse.json([
      {
        id: "project-1",
        name: "Sample Project",
        description: "This is a sample project for development",
        userId: session.user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]);
  } catch (error) {
    console.error('Error getting projects:', error);
    return NextResponse.json(
      { error: "Failed to get projects" },
      { status: 500 }
    );
  }
}
```

## API Testing

Always test your API endpoints before deploying:

### Using Jest for API Tests

```typescript
// tests/api/projects.test.ts
import { testApiHandler } from 'next-test-api-route-handler';
import projectsHandler from '@/pages/api/projects';
import { createMocks } from 'node-mocks-http';

// Mock authentication
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(() => Promise.resolve({
    user: { id: 'user-123', email: 'test@example.com' }
  }))
}));

// Mock DBService
jest.mock('@/backend/db/dbService', () => {
  return {
    DBService: jest.fn().mockImplementation(() => ({
      getProjectsByUser: jest.fn().mockResolvedValue([
        { id: 'project-1', name: 'Test Project', userId: 'user-123' }
      ]),
      createProject: jest.fn().mockImplementation((data) => Promise.resolve({
        id: 'new-project',
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }))
    }))
  };
});

describe('Projects API', () => {
  it('should return 401 if not authenticated', async () => {
    // Override mock to return null session
    require('next-auth/next').getServerSession.mockImplementationOnce(() => null);
    
    await testApiHandler({
      handler: projectsHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: 'GET' });
        expect(res.status).toBe(401);
        const data = await res.json();
        expect(data.error).toBe('Unauthorized');
      },
    });
  });

  it('should return user projects', async () => {
    await testApiHandler({
      handler: projectsHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: 'GET' });
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data).toHaveLength(1);
        expect(data[0].name).toBe('Test Project');
      },
    });
  });

  it('should create a new project', async () => {
    await testApiHandler({
      handler: projectsHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'New Project', description: 'Test' })
        });
        expect(res.status).toBe(201);
        const data = await res.json();
        expect(data.name).toBe('New Project');
        expect(data.description).toBe('Test');
        expect(data.id).toBe('new-project');
      },
    });
  });
});
```

---

Following this guide will help ensure consistent, maintainable, and secure API endpoints across the BiteBase platform. For any questions or updates to these standards, please contact the development team. 