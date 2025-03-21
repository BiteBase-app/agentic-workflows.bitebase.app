import { describe, it, expect, beforeAll, afterAll } from 'jest';
import { createServer } from 'http';
import { apiResolver } from 'next/dist/server/api-resolver';
import fetch from 'node-fetch';
import { nanoid } from 'nanoid';

// Import API route handlers
import * as projectsHandler from '@/app/api/projects/route';
import * as competitorsHandler from '@/app/api/inventory/route';
import * as insightsHandler from '@/app/api/insights/route';
import * as analyticsHandler from '@/app/api/analytics/route';

// Import types
import { 
  User, Project, Competitor, DemographicData, 
  TrafficData, MenuItem, Insight 
} from '@/types';

// Mock data for testing
const mockUser: User = {
  id: nanoid(),
  name: "Test User",
  email: "test@example.com",
  role: "user",
  createdAt: new Date(),
  updatedAt: new Date()
};

let server;
let baseUrl;
let testProjectId;

// Mock authentication for testing
jest.mock('@/lib/auth-helpers', () => ({
  getServerAuth: jest.fn().mockResolvedValue({
    user: mockUser
  })
}));

// Mock database queries
jest.mock('@/lib/db-queries', () => ({
  // User queries
  getUserById: jest.fn().mockImplementation((id) => {
    return Promise.resolve(mockUser);
  }),

  // Project queries
  getProjectsByUserId: jest.fn().mockImplementation((userId) => {
    return Promise.resolve([
      {
        id: "mock-project-1",
        name: "Test Project 1",
        description: "Test project for API tests",
        location: "Test Location",
        address: "123 Test St",
        cuisine: "Test Cuisine",
        coordinates: { lat: 40.123, lng: -74.456 },
        radius: 1.5,
        status: "active",
        userId: userId,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  }),
  
  getProjectById: jest.fn().mockImplementation((id) => {
    return Promise.resolve({
      id,
      name: "Test Project",
      description: "Test project for API tests",
      location: "Test Location",
      address: "123 Test St",
      cuisine: "Test Cuisine",
      coordinates: { lat: 40.123, lng: -74.456 },
      radius: 1.5,
      status: "active",
      userId: mockUser.id,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }),

  createProject: jest.fn().mockImplementation((project) => {
    const createdProject = {
      id: nanoid(),
      ...project,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    testProjectId = createdProject.id;
    return Promise.resolve(createdProject);
  }),

  // Competitor queries
  getCompetitorsByProjectId: jest.fn().mockImplementation((projectId) => {
    return Promise.resolve([
      {
        id: "mock-competitor-1",
        name: "Competitor 1",
        description: "Test competitor",
        cuisine: "Italian",
        address: "456 Competitor St",
        coordinates: { lat: 40.123, lng: -74.456 },
        rating: 4.5,
        priceRange: 2,
        projectId,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  }),

  // Insight queries
  getInsightsByProjectId: jest.fn().mockImplementation((projectId) => {
    return Promise.resolve([
      {
        id: "mock-insight-1",
        projectId,
        title: "Test Insight",
        description: "This is a test insight",
        category: "price",
        impact: "high",
        actionable: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  }),

  // Demographic data queries
  getDemographicDataByProjectId: jest.fn().mockImplementation((projectId) => {
    return Promise.resolve({
      id: "mock-demo-1",
      projectId,
      populationDensity: 5000,
      medianIncome: 75000,
      ageDistribution: {
        under18: 15,
        age18to24: 10,
        age25to34: 25,
        age35to44: 20,
        age45to54: 15,
        age55to64: 10,
        age65plus: 5
      },
      educationLevels: {
        highSchool: 25,
        someCollege: 30,
        bachelors: 35,
        graduate: 10
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }),

  // Traffic data queries
  getTrafficDataByProjectId: jest.fn().mockImplementation((projectId) => {
    return Promise.resolve({
      id: "mock-traffic-1",
      projectId,
      weekdayAverage: 1000,
      weekendAverage: 1500,
      peakHours: {
        morning: 300,
        afternoon: 500,
        evening: 700,
        night: 200
      },
      seasonalVariation: {
        spring: 1.1,
        summer: 1.3,
        fall: 1.0,
        winter: 0.8
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }),

  // Menu items queries
  getMenuItemsByProjectId: jest.fn().mockImplementation((projectId) => {
    return Promise.resolve([
      {
        id: "mock-menu-1",
        name: "Test Item 1",
        description: "Test menu item",
        category: "Appetizer",
        price: 9.99,
        cost: 3.50,
        popularity: 85,
        projectId,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  }),
}));

describe('API Integration Tests', () => {
  beforeAll(async () => {
    // Set up a test server
    server = createServer(async (req, res) => {
      const { url } = req;
      
      if (url.startsWith('/api/projects')) {
        await apiResolver(req, res, undefined, projectsHandler, {});
      } else if (url.startsWith('/api/inventory')) {
        await apiResolver(req, res, undefined, competitorsHandler, {});
      } else if (url.startsWith('/api/insights')) {
        await apiResolver(req, res, undefined, insightsHandler, {});
      } else if (url.startsWith('/api/analytics')) {
        await apiResolver(req, res, undefined, analyticsHandler, {});
      } else {
        res.statusCode = 404;
        res.end('Not found');
      }
    });

    await new Promise((resolve) => {
      server.listen(0, () => {
        baseUrl = `http://localhost:${server.address().port}`;
        resolve();
      });
    });
  });

  afterAll(() => {
    server.close();
  });

  // Project API Tests
  describe('Projects API', () => {
    it('should retrieve all projects for the current user', async () => {
      const response = await fetch(`${baseUrl}/api/projects`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      expect(data[0]).toHaveProperty('id');
      expect(data[0]).toHaveProperty('name');
      expect(data[0]).toHaveProperty('description');
      expect(data[0]).toHaveProperty('location');
      expect(data[0]).toHaveProperty('cuisine');
      expect(data[0]).toHaveProperty('coordinates');
    });

    it('should create a new project', async () => {
      const projectData = {
        name: "New Test Project",
        description: "Created during API tests",
        location: "Test City",
        address: "789 Test Blvd",
        cuisine: "Test Food",
        coordinates: { lat: 41.123, lng: -75.456 },
        radius: 2.0
      };

      const response = await fetch(`${baseUrl}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData)
      });
      
      const data = await response.json();
      
      expect(response.status).toBe(201);
      expect(data).toHaveProperty('id');
      expect(data.name).toBe(projectData.name);
      expect(data.cuisine).toBe(projectData.cuisine);
      expect(data.userId).toBe(mockUser.id);
    });
  });

  // Competitors API Tests
  describe('Competitors API', () => {
    it('should retrieve competitors for a project', async () => {
      const response = await fetch(`${baseUrl}/api/inventory?projectId=${testProjectId}`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      expect(data[0]).toHaveProperty('id');
      expect(data[0]).toHaveProperty('name');
      expect(data[0]).toHaveProperty('cuisine');
      expect(data[0]).toHaveProperty('rating');
      expect(data[0]).toHaveProperty('priceRange');
    });
  });

  // Insights API Tests
  describe('Insights API', () => {
    it('should retrieve insights for a project', async () => {
      const response = await fetch(`${baseUrl}/api/insights?projectId=${testProjectId}`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      expect(data[0]).toHaveProperty('id');
      expect(data[0]).toHaveProperty('title');
      expect(data[0]).toHaveProperty('description');
      expect(data[0]).toHaveProperty('category');
      expect(data[0]).toHaveProperty('impact');
    });
  });

  // Analytics API Tests
  describe('Analytics API', () => {
    it('should retrieve demographic data for a project', async () => {
      const response = await fetch(`${baseUrl}/api/analytics/demographics?projectId=${testProjectId}`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('populationDensity');
      expect(data).toHaveProperty('medianIncome');
      expect(data).toHaveProperty('ageDistribution');
      expect(data).toHaveProperty('educationLevels');
    });

    it('should retrieve traffic data for a project', async () => {
      const response = await fetch(`${baseUrl}/api/analytics/traffic?projectId=${testProjectId}`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('weekdayAverage');
      expect(data).toHaveProperty('weekendAverage');
      expect(data).toHaveProperty('peakHours');
      expect(data).toHaveProperty('seasonalVariation');
    });

    it('should retrieve menu items for a project', async () => {
      const response = await fetch(`${baseUrl}/api/analytics/menu-items?projectId=${testProjectId}`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      expect(data[0]).toHaveProperty('id');
      expect(data[0]).toHaveProperty('name');
      expect(data[0]).toHaveProperty('price');
      expect(data[0]).toHaveProperty('cost');
      expect(data[0]).toHaveProperty('popularity');
    });
  });

  // Comprehensive data retrieval test for frontend needs
  describe('Frontend Data Requirements', () => {
    it('should be able to fetch all necessary data for project dashboard', async () => {
      // Get project details
      const projectResponse = await fetch(`${baseUrl}/api/projects/${testProjectId}`);
      const project = await projectResponse.json();
      
      expect(projectResponse.status).toBe(200);
      expect(project).toHaveProperty('id');
      
      // Get competitors
      const competitorsResponse = await fetch(`${baseUrl}/api/inventory?projectId=${testProjectId}`);
      const competitors = await competitorsResponse.json();
      
      expect(competitorsResponse.status).toBe(200);
      expect(Array.isArray(competitors)).toBe(true);
      
      // Get insights
      const insightsResponse = await fetch(`${baseUrl}/api/insights?projectId=${testProjectId}`);
      const insights = await insightsResponse.json();
      
      expect(insightsResponse.status).toBe(200);
      expect(Array.isArray(insights)).toBe(true);
      
      // Get demographic data
      const demoResponse = await fetch(`${baseUrl}/api/analytics/demographics?projectId=${testProjectId}`);
      const demographics = await demoResponse.json();
      
      expect(demoResponse.status).toBe(200);
      expect(demographics).toHaveProperty('populationDensity');
      
      // Get traffic data
      const trafficResponse = await fetch(`${baseUrl}/api/analytics/traffic?projectId=${testProjectId}`);
      const traffic = await trafficResponse.json();
      
      expect(trafficResponse.status).toBe(200);
      expect(traffic).toHaveProperty('weekdayAverage');
      
      // Get menu items
      const menuResponse = await fetch(`${baseUrl}/api/analytics/menu-items?projectId=${testProjectId}`);
      const menuItems = await menuResponse.json();
      
      expect(menuResponse.status).toBe(200);
      expect(Array.isArray(menuItems)).toBe(true);
      
      // Ensure we have all the data needed for the dashboard
      const dashboardData = {
        project,
        competitors,
        insights,
        demographics,
        traffic,
        menuItems
      };
      
      // Verify we have all required properties for frontend
      expect(dashboardData).toHaveProperty('project');
      expect(dashboardData).toHaveProperty('competitors');
      expect(dashboardData).toHaveProperty('insights');
      expect(dashboardData).toHaveProperty('demographics');
      expect(dashboardData).toHaveProperty('traffic');
      expect(dashboardData).toHaveProperty('menuItems');
    });
  });
}); 