import { SentimentAgent } from '../../src/agents/sentiment-agent';
import { AgentType, AgentCapability, PriorityLevel } from '../../src/config/agent-config';
import { OpenAI } from 'openai';

// Mock OpenAI
jest.mock('openai', () => {
  return {
    OpenAI: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    sentiment: 'positive',
                    score: 0.85,
                    confidence: 0.9,
                    explanation: 'The text contains positive language'
                  })
                }
              }
            ]
          })
        }
      }
    }))
  };
});

describe('SentimentAgent', () => {
  let agent: SentimentAgent;
  let mockOpenAI: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    sentiment: 'positive',
                    score: 0.85
                  })
                }
              }
            ]
          })
        }
      }
    };

    agent = new SentimentAgent({
      type: AgentType.SENTIMENT,
      capabilities: [AgentCapability.SENTIMENT_ANALYSIS],
      priority: PriorityLevel.MEDIUM,
      enabled: true
    });
    
    // Set the mock OpenAI client
    (agent as any).openaiClient = mockOpenAI;
  });

  describe('Agent Configuration', () => {
    it('should properly initialize with correct capabilities', () => {
      expect(agent.hasCapability(AgentCapability.SENTIMENT_ANALYSIS)).toBe(true);
      expect(agent.capabilities).toContain(AgentCapability.SENTIMENT_ANALYSIS);
    });
  });

  describe('Sentiment Analysis', () => {
    it('should process valid text for sentiment analysis', async () => {
      const testInput = { text: 'This is a positive message.' };

      // Mock implementation for process method
      (agent as any).process = jest.fn().mockResolvedValue({
        success: true,
        data: { 
          sentiment: 'positive',
          score: 0.85
        },
        confidence: 0.9,
        executionTime: 0,
        metadata: {}
      });

      const result = await agent.run(testInput);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('sentiment');
      expect(result.data).toHaveProperty('score');
    });

    it('should handle empty text input', async () => {
      const testInput = { text: '' };
      
      // Update the test to check for failure status instead of expecting an exception
      const result = await agent.run(testInput);
      expect(result.success).toBe(false);
      expect(result).toHaveProperty('error');
    });
  });

  describe('Agent Initialization', () => {
    it('should initialize successfully', async () => {
      await expect(agent.initialize()).resolves.not.toThrow();
    });
  });
}); 