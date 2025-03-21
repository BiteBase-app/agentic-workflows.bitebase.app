import { BiteBaseService } from '../../src/services/bitebase-service';
import { BitesClient } from '@bitebase/client';

// Mocking the BitesClient
jest.mock('@bitebase/client');

describe('BiteBaseService', () => {
  let biteBaseService: BiteBaseService;
  let mockClient: jest.Mocked<BitesClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a mock for BitesClient
    mockClient = new BitesClient('fake-key') as jest.Mocked<BitesClient>;
    
    // Mock the implementation methods
    mockClient.projects = {
      list: jest.fn().mockResolvedValue({
        data: [
          { id: 'project-1', name: 'Test Project 1' },
          { id: 'project-2', name: 'Test Project 2' }
        ]
      }),
      get: jest.fn().mockResolvedValue({
        data: { id: 'project-1', name: 'Test Project 1' }
      })
    };
    
    mockClient.bites = {
      list: jest.fn().mockResolvedValue({
        data: [
          { id: 'bite-1', name: 'Test Bite 1', projectId: 'project-1' },
          { id: 'bite-2', name: 'Test Bite 2', projectId: 'project-1' }
        ]
      }),
      get: jest.fn().mockResolvedValue({
        data: { id: 'bite-1', name: 'Test Bite 1', projectId: 'project-1' }
      }),
      update: jest.fn().mockResolvedValue({
        data: { id: 'bite-1', name: 'Updated Bite', projectId: 'project-1' }
      }),
      create: jest.fn().mockResolvedValue({
        data: { id: 'new-bite', name: 'New Bite', projectId: 'project-1' }
      })
    };
    
    (BitesClient as jest.Mock).mockImplementation(() => mockClient);
    
    // Initialize the service with the mock client
    biteBaseService = new BiteBaseService('fake-key');
  });

  describe('Initialization', () => {
    it('should create an instance with an API key', () => {
      expect(biteBaseService).toBeDefined();
      expect(BitesClient).toHaveBeenCalledWith('fake-key');
    });
  });

  describe('Projects', () => {
    it('should list projects', async () => {
      const projects = await biteBaseService.listProjects();
      
      expect(projects).toHaveLength(2);
      expect(projects[0]).toHaveProperty('id', 'project-1');
      expect(projects[1]).toHaveProperty('id', 'project-2');
      expect(mockClient.projects.list).toHaveBeenCalled();
    });

    it('should get a project by ID', async () => {
      const project = await biteBaseService.getProject('project-1');
      
      expect(project).toHaveProperty('id', 'project-1');
      expect(project).toHaveProperty('name', 'Test Project 1');
      expect(mockClient.projects.get).toHaveBeenCalledWith('project-1');
    });

    it('should handle errors when listing projects', async () => {
      mockClient.projects.list.mockRejectedValueOnce(new Error('API error'));
      
      await expect(biteBaseService.listProjects()).rejects.toThrow('API error');
    });
  });

  describe('Bites', () => {
    it('should list bites for a project', async () => {
      const bites = await biteBaseService.listBites('project-1');
      
      expect(bites).toHaveLength(2);
      expect(bites[0]).toHaveProperty('id', 'bite-1');
      expect(bites[1]).toHaveProperty('id', 'bite-2');
      expect(mockClient.bites.list).toHaveBeenCalledWith({ projectId: 'project-1' });
    });

    it('should get a bite by ID', async () => {
      const bite = await biteBaseService.getBite('bite-1');
      
      expect(bite).toHaveProperty('id', 'bite-1');
      expect(bite).toHaveProperty('name', 'Test Bite 1');
      expect(mockClient.bites.get).toHaveBeenCalledWith('bite-1');
    });

    it('should create a new bite', async () => {
      const newBite = await biteBaseService.createBite({
        name: 'New Bite',
        projectId: 'project-1',
        content: 'Test content',
        metadata: { test: true }
      });
      
      expect(newBite).toHaveProperty('id', 'new-bite');
      expect(newBite).toHaveProperty('name', 'New Bite');
      expect(mockClient.bites.create).toHaveBeenCalledWith({
        name: 'New Bite',
        projectId: 'project-1',
        content: 'Test content',
        metadata: { test: true }
      });
    });

    it('should update an existing bite', async () => {
      const updatedBite = await biteBaseService.updateBite('bite-1', {
        name: 'Updated Bite'
      });
      
      expect(updatedBite).toHaveProperty('id', 'bite-1');
      expect(updatedBite).toHaveProperty('name', 'Updated Bite');
      expect(mockClient.bites.update).toHaveBeenCalledWith('bite-1', {
        name: 'Updated Bite'
      });
    });

    it('should handle errors when getting a bite', async () => {
      mockClient.bites.get.mockRejectedValueOnce(new Error('Bite not found'));
      
      await expect(biteBaseService.getBite('nonexistent')).rejects.toThrow('Bite not found');
    });
  });

  describe('Integration data', () => {
    it('should get integration data', async () => {
      // Set up to return different mock values
      mockClient.projects.list.mockResolvedValueOnce({
        data: [
          { id: 'project-1', name: 'Test Project 1' },
          { id: 'project-2', name: 'Test Project 2' }
        ]
      });
      
      mockClient.bites.list.mockResolvedValueOnce({
        data: [
          { id: 'bite-1', name: 'Test Bite 1', projectId: 'project-1' },
          { id: 'bite-2', name: 'Test Bite 2', projectId: 'project-1' },
          { id: 'bite-3', name: 'Test Bite 3', projectId: 'project-2' }
        ]
      });
      
      const integrationData = await biteBaseService.getIntegrationData();
      
      expect(integrationData).toHaveProperty('projects');
      expect(integrationData).toHaveProperty('bites');
      expect(integrationData.projects).toHaveLength(2);
      expect(integrationData.bites).toHaveLength(3);
      expect(mockClient.projects.list).toHaveBeenCalled();
      expect(mockClient.bites.list).toHaveBeenCalled();
    });

    it('should handle errors when getting integration data', async () => {
      mockClient.projects.list.mockRejectedValueOnce(new Error('Network error'));
      
      await expect(biteBaseService.getIntegrationData()).rejects.toThrow('Network error');
    });
  });
}); 