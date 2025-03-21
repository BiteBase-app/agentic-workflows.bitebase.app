import { describe, it, expect, beforeEach, afterEach } from 'jest';
import fetch from 'node-fetch';
import { nanoid } from 'nanoid';

// Base API URL - should be updated to match your environment
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';

// Test JWT token - should be replaced with a valid token for your environment
const TEST_AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || 'test-token';

// Test project ID for existing project
const TEST_PROJECT_ID = process.env.TEST_PROJECT_ID || 'test-project-1';

describe('BiteBase API Endpoints Tests', () => {
  
  // Authentication tests
  describe('Authentication API', () => {
    it('should validate user credentials', async () => {
      const response = await fetch(`${API_BASE_URL}/auth/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_AUTH_TOKEN}`
        }
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('authenticated', true);
    });
  });
  
  // Projects API tests
  describe('Projects API', () => {
    it('should list all projects for authenticated user', async () => {
      const response = await fetch(`${API_BASE_URL}/projects`, {
        headers: {
          'Authorization': `Bearer ${TEST_AUTH_TOKEN}`
        }
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      
      if (data.length > 0) {
        const project = data[0];
        expect(project).toHaveProperty('id');
        expect(project).toHaveProperty('name');
        expect(project).toHaveProperty('location');
        expect(project).toHaveProperty('cuisine');
        expect(project).toHaveProperty('status');
      }
    });
    
    it('should successfully create a new project', async () => {
      const newProject = {
        name: `Test Project ${Date.now()}`,
        description: 'Project created by automated tests',
        location: 'Test Location',
        address: '123 Test Street',
        cuisine: 'Test Cuisine',
        coordinates: { lat: 41.8781, lng: -87.6298 },
        radius: 1.2,
      };
      
      const response = await fetch(`${API_BASE_URL}/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_AUTH_TOKEN}`
        },
        body: JSON.stringify(newProject)
      });
      
      expect(response.status).toBe(201);
      const project = await response.json();
      expect(project).toHaveProperty('id');
      expect(project.name).toBe(newProject.name);
      expect(project.cuisine).toBe(newProject.cuisine);
    });
    
    it('should retrieve a specific project by ID', async () => {
      const response = await fetch(`${API_BASE_URL}/projects/${TEST_PROJECT_ID}`, {
        headers: {
          'Authorization': `Bearer ${TEST_AUTH_TOKEN}`
        }
      });
      
      expect(response.status).toBe(200);
      const project = await response.json();
      expect(project).toHaveProperty('id', TEST_PROJECT_ID);
      expect(project).toHaveProperty('name');
      expect(project).toHaveProperty('description');
      expect(project).toHaveProperty('location');
      expect(project).toHaveProperty('coordinates');
    });
  });
  
  // Competitors API tests
  describe('Competitors API', () => {
    it('should list competitors for a specific project', async () => {
      const response = await fetch(`${API_BASE_URL}/inventory?projectId=${TEST_PROJECT_ID}`, {
        headers: {
          'Authorization': `Bearer ${TEST_AUTH_TOKEN}`
        }
      });
      
      expect(response.status).toBe(200);
      const competitors = await response.json();
      expect(Array.isArray(competitors)).toBe(true);
      
      if (competitors.length > 0) {
        const competitor = competitors[0];
        expect(competitor).toHaveProperty('id');
        expect(competitor).toHaveProperty('name');
        expect(competitor).toHaveProperty('cuisine');
        expect(competitor).toHaveProperty('address');
        expect(competitor).toHaveProperty('rating');
        expect(competitor).toHaveProperty('priceRange');
        expect(competitor).toHaveProperty('projectId', TEST_PROJECT_ID);
      }
    });
    
    it('should create a new competitor for a project', async () => {
      const newCompetitor = {
        name: `Competitor ${Date.now()}`,
        description: 'Competitor created by automated tests',
        cuisine: 'Test Cuisine',
        address: '456 Competitor Street',
        coordinates: { lat: 41.8781, lng: -87.6298 },
        rating: 4.2,
        priceRange: 3,
        projectId: TEST_PROJECT_ID
      };
      
      const response = await fetch(`${API_BASE_URL}/inventory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_AUTH_TOKEN}`
        },
        body: JSON.stringify(newCompetitor)
      });
      
      expect(response.status).toBe(201);
      const competitor = await response.json();
      expect(competitor).toHaveProperty('id');
      expect(competitor.name).toBe(newCompetitor.name);
      expect(competitor.projectId).toBe(TEST_PROJECT_ID);
    });
  });
  
  // Demographic Data API tests
  describe('Demographic Data API', () => {
    it('should retrieve demographic data for a project', async () => {
      const response = await fetch(`${API_BASE_URL}/analytics/demographics?projectId=${TEST_PROJECT_ID}`, {
        headers: {
          'Authorization': `Bearer ${TEST_AUTH_TOKEN}`
        }
      });
      
      expect(response.status).toBe(200);
      const demographics = await response.json();
      expect(demographics).toHaveProperty('projectId', TEST_PROJECT_ID);
      expect(demographics).toHaveProperty('populationDensity');
      expect(demographics).toHaveProperty('medianIncome');
      expect(demographics).toHaveProperty('ageDistribution');
      expect(demographics.ageDistribution).toHaveProperty('under18');
      expect(demographics.ageDistribution).toHaveProperty('age25to34');
      expect(demographics).toHaveProperty('educationLevels');
      expect(demographics.educationLevels).toHaveProperty('highSchool');
      expect(demographics.educationLevels).toHaveProperty('bachelors');
    });
  });
  
  // Traffic Data API tests
  describe('Traffic Data API', () => {
    it('should retrieve traffic data for a project', async () => {
      const response = await fetch(`${API_BASE_URL}/analytics/traffic?projectId=${TEST_PROJECT_ID}`, {
        headers: {
          'Authorization': `Bearer ${TEST_AUTH_TOKEN}`
        }
      });
      
      expect(response.status).toBe(200);
      const traffic = await response.json();
      expect(traffic).toHaveProperty('projectId', TEST_PROJECT_ID);
      expect(traffic).toHaveProperty('weekdayAverage');
      expect(traffic).toHaveProperty('weekendAverage');
      expect(traffic).toHaveProperty('peakHours');
      expect(traffic.peakHours).toHaveProperty('morning');
      expect(traffic.peakHours).toHaveProperty('evening');
      expect(traffic).toHaveProperty('seasonalVariation');
      expect(traffic.seasonalVariation).toHaveProperty('summer');
      expect(traffic.seasonalVariation).toHaveProperty('winter');
    });
  });
  
  // Menu Items API tests
  describe('Menu Items API', () => {
    it('should list menu items for a project', async () => {
      const response = await fetch(`${API_BASE_URL}/analytics/menu-items?projectId=${TEST_PROJECT_ID}`, {
        headers: {
          'Authorization': `Bearer ${TEST_AUTH_TOKEN}`
        }
      });
      
      expect(response.status).toBe(200);
      const menuItems = await response.json();
      expect(Array.isArray(menuItems)).toBe(true);
      
      if (menuItems.length > 0) {
        const menuItem = menuItems[0];
        expect(menuItem).toHaveProperty('id');
        expect(menuItem).toHaveProperty('name');
        expect(menuItem).toHaveProperty('description');
        expect(menuItem).toHaveProperty('category');
        expect(menuItem).toHaveProperty('price');
        expect(menuItem).toHaveProperty('cost');
        expect(menuItem).toHaveProperty('popularity');
        expect(menuItem).toHaveProperty('projectId', TEST_PROJECT_ID);
      }
    });
    
    it('should create a new menu item for a project', async () => {
      const newMenuItem = {
        name: `Menu Item ${Date.now()}`,
        description: 'Menu item created by automated tests',
        category: 'Test Category',
        price: 12.99,
        cost: 4.50,
        popularity: 75,
        projectId: TEST_PROJECT_ID
      };
      
      const response = await fetch(`${API_BASE_URL}/analytics/menu-items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_AUTH_TOKEN}`
        },
        body: JSON.stringify(newMenuItem)
      });
      
      expect(response.status).toBe(201);
      const menuItem = await response.json();
      expect(menuItem).toHaveProperty('id');
      expect(menuItem.name).toBe(newMenuItem.name);
      expect(menuItem.price).toBe(newMenuItem.price);
      expect(menuItem.projectId).toBe(TEST_PROJECT_ID);
    });
  });
  
  // Insights API tests
  describe('Insights API', () => {
    it('should list insights for a project', async () => {
      const response = await fetch(`${API_BASE_URL}/insights?projectId=${TEST_PROJECT_ID}`, {
        headers: {
          'Authorization': `Bearer ${TEST_AUTH_TOKEN}`
        }
      });
      
      expect(response.status).toBe(200);
      const insights = await response.json();
      expect(Array.isArray(insights)).toBe(true);
      
      if (insights.length > 0) {
        const insight = insights[0];
        expect(insight).toHaveProperty('id');
        expect(insight).toHaveProperty('title');
        expect(insight).toHaveProperty('description');
        expect(insight).toHaveProperty('category');
        expect(insight).toHaveProperty('impact');
        expect(insight).toHaveProperty('actionable');
        expect(insight).toHaveProperty('projectId', TEST_PROJECT_ID);
      }
    });
    
    it('should create a new insight for a project', async () => {
      const newInsight = {
        title: `Insight ${Date.now()}`,
        description: 'Insight created by automated tests',
        category: 'price',
        impact: 'medium',
        actionable: true,
        projectId: TEST_PROJECT_ID
      };
      
      const response = await fetch(`${API_BASE_URL}/insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_AUTH_TOKEN}`
        },
        body: JSON.stringify(newInsight)
      });
      
      expect(response.status).toBe(201);
      const insight = await response.json();
      expect(insight).toHaveProperty('id');
      expect(insight.title).toBe(newInsight.title);
      expect(insight.category).toBe(newInsight.category);
      expect(insight.projectId).toBe(TEST_PROJECT_ID);
    });
  });
  
  // Error Handling tests
  describe('Error Handling', () => {
    it('should return 401 for unauthorized access', async () => {
      const response = await fetch(`${API_BASE_URL}/projects`);
      expect(response.status).toBe(401);
    });
    
    it('should return 404 for non-existent project', async () => {
      const nonExistentId = 'non-existent-id-' + Date.now();
      const response = await fetch(`${API_BASE_URL}/projects/${nonExistentId}`, {
        headers: {
          'Authorization': `Bearer ${TEST_AUTH_TOKEN}`
        }
      });
      
      expect(response.status).toBe(404);
    });
    
    it('should return 400 for invalid project data', async () => {
      const invalidProject = {
        // Missing required fields: name, location, cuisine
        description: 'Invalid project'
      };
      
      const response = await fetch(`${API_BASE_URL}/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_AUTH_TOKEN}`
        },
        body: JSON.stringify(invalidProject)
      });
      
      expect(response.status).toBe(400);
    });
  });
  
  // Performance tests 
  describe('API Performance', () => {
    it('should retrieve project data within acceptable time limit', async () => {
      const startTime = Date.now();
      
      const response = await fetch(`${API_BASE_URL}/projects/${TEST_PROJECT_ID}`, {
        headers: {
          'Authorization': `Bearer ${TEST_AUTH_TOKEN}`
        }
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(1000); // 1 second maximum response time
    });
    
    it('should retrieve full dashboard data within acceptable time limit', async () => {
      const startTime = Date.now();
      
      // Make parallel requests for all dashboard data
      const [
        projectResponse,
        competitorsResponse,
        insightsResponse,
        demographicsResponse,
        trafficResponse,
        menuItemsResponse
      ] = await Promise.all([
        fetch(`${API_BASE_URL}/projects/${TEST_PROJECT_ID}`, {
          headers: { 'Authorization': `Bearer ${TEST_AUTH_TOKEN}` }
        }),
        fetch(`${API_BASE_URL}/inventory?projectId=${TEST_PROJECT_ID}`, {
          headers: { 'Authorization': `Bearer ${TEST_AUTH_TOKEN}` }
        }),
        fetch(`${API_BASE_URL}/insights?projectId=${TEST_PROJECT_ID}`, {
          headers: { 'Authorization': `Bearer ${TEST_AUTH_TOKEN}` }
        }),
        fetch(`${API_BASE_URL}/analytics/demographics?projectId=${TEST_PROJECT_ID}`, {
          headers: { 'Authorization': `Bearer ${TEST_AUTH_TOKEN}` }
        }),
        fetch(`${API_BASE_URL}/analytics/traffic?projectId=${TEST_PROJECT_ID}`, {
          headers: { 'Authorization': `Bearer ${TEST_AUTH_TOKEN}` }
        }),
        fetch(`${API_BASE_URL}/analytics/menu-items?projectId=${TEST_PROJECT_ID}`, {
          headers: { 'Authorization': `Bearer ${TEST_AUTH_TOKEN}` }
        })
      ]);
      
      const endTime = Date.now();
      const totalResponseTime = endTime - startTime;
      
      // All responses should be successful
      expect(projectResponse.status).toBe(200);
      expect(competitorsResponse.status).toBe(200);
      expect(insightsResponse.status).toBe(200);
      expect(demographicsResponse.status).toBe(200);
      expect(trafficResponse.status).toBe(200);
      expect(menuItemsResponse.status).toBe(200);
      
      // Total response time should be reasonable for a dashboard load
      expect(totalResponseTime).toBeLessThan(3000); // 3 seconds maximum for all requests
    });
  });
}); 