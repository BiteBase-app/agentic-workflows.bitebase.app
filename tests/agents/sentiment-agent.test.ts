import { SentimentAgent } from '../../src/agents/sentiment-agent';
import { AgentCapability, PriorityLevel } from '../../src/config/agent-config';
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

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create agent instance
    agent = new SentimentAgent();
  });

  describe('Agent Configuration', () => {
    it('should properly initialize with correct capabilities', () => {
      expect(agent.hasCapability(AgentCapability.SENTIMENT_ANALYSIS)).toBe(true);
      expect(agent.capabilities).toContain(AgentCapability.SENTIMENT_ANALYSIS);
    });
  });

  describe('Sentiment Analysis', () => {
    it('should process valid text for sentiment analysis', async () => {
      const testInput = { text: 'I am very happy with the service!' };
      
      const result = await agent.run(testInput);
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('sentiment');
      expect(result.data).toHaveProperty('score');
      expect(result.data).toHaveProperty('confidence');
      expect(result.data).toHaveProperty('explanation');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should throw an error for empty text input', async () => {
      const testInput = { text: '' };
      
      await expect(agent.run(testInput)).rejects.toThrow();
    });
  });

  describe('Agent Initialization', () => {
    it('should initialize successfully', async () => {
      await expect(agent.initialize()).resolves.not.toThrow();
    });
  });
}); 