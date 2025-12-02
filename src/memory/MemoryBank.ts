import { Memory } from '../types/index.js';
import { logger } from '../observability/logger.js';
import { standardMetrics } from '../observability/metrics.js';

/**
 * Long-term memory storage for the agent system
 * Stores recurring information like bills, subscriptions, documents, preferences
 * Implements context compaction and memory retrieval optimization
 */
export class MemoryBank {
  private memories: Map<string, Memory> = new Map();
  private typeIndex: Map<string, Set<string>> = new Map();
  private embeddings: Map<string, number[]> = new Map();

  /**
   * Store a memory
   */
  async store(params: {
    type: Memory['type'];
    content: any;
    metadata?: Record<string, any>;
  }): Promise<string> {
    const memoryId = `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const memory: Memory = {
      id: memoryId,
      type: params.type,
      content: params.content,
      createdAt: new Date(),
      lastAccessed: new Date(),
      accessCount: 0,
      metadata: params.metadata || {}
    };

    // Generate embedding for semantic search (mock implementation)
    memory.embedding = await this.generateEmbedding(JSON.stringify(params.content));

    this.memories.set(memoryId, memory);

    // Update type index
    if (!this.typeIndex.has(params.type)) {
      this.typeIndex.set(params.type, new Set());
    }
    this.typeIndex.get(params.type)!.add(memoryId);

    logger.info('Memory stored', { memoryId, type: params.type });
    standardMetrics.memoryStored();

    return memoryId;
  }

  /**
   * Retrieve memories by type
   */
  retrieveByType(type: Memory['type'], limit?: number): Memory[] {
    const memoryIds = this.typeIndex.get(type) || new Set();
    let memories = Array.from(memoryIds)
      .map(id => this.memories.get(id))
      .filter((m): m is Memory => m !== undefined);

    // Update access stats
    memories.forEach(m => {
      m.lastAccessed = new Date();
      m.accessCount++;
    });

    // Sort by most recently accessed
    memories.sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime());

    if (limit) {
      memories = memories.slice(0, limit);
    }

    logger.debug('Memories retrieved by type', {
      type,
      count: memories.length
    });

    standardMetrics.memoryRetrieved(memories.length);

    return memories;
  }

  /**
   * Retrieve memories by query (semantic search)
   */
  async retrieveByQuery(query: string, limit: number = 5): Promise<Memory[]> {
    const queryEmbedding = await this.generateEmbedding(query);

    // Calculate similarity scores
    const scored = Array.from(this.memories.values()).map(memory => {
      const similarity = memory.embedding
        ? this.cosineSimilarity(queryEmbedding, memory.embedding)
        : 0;
      return { memory, similarity };
    });

    // Sort by similarity and take top results
    scored.sort((a, b) => b.similarity - a.similarity);
    const results = scored.slice(0, limit).map(s => s.memory);

    // Update access stats
    results.forEach(m => {
      m.lastAccessed = new Date();
      m.accessCount++;
    });

    logger.debug('Memories retrieved by query', {
      query,
      count: results.length
    });

    standardMetrics.memoryRetrieved(results.length);

    return results;
  }

  /**
   * Retrieve memory by ID
   */
  retrieveById(memoryId: string): Memory | null {
    const memory = this.memories.get(memoryId);
    if (memory) {
      memory.lastAccessed = new Date();
      memory.accessCount++;
    }
    return memory || null;
  }

  /**
   * Update a memory
   */
  update(memoryId: string, updates: Partial<Memory>): boolean {
    const memory = this.memories.get(memoryId);
    if (!memory) {
      return false;
    }

    Object.assign(memory, updates);
    logger.info('Memory updated', { memoryId });
    return true;
  }

  /**
   * Delete a memory
   */
  delete(memoryId: string): boolean {
    const memory = this.memories.get(memoryId);
    if (!memory) {
      return false;
    }

    this.memories.delete(memoryId);

    // Update type index
    const typeSet = this.typeIndex.get(memory.type);
    if (typeSet) {
      typeSet.delete(memoryId);
    }

    logger.info('Memory deleted', { memoryId });
    return true;
  }

  /**
   * Context compaction: Get relevant memories for an agent
   * Only retrieves memories relevant to the agent's task
   */
  compactContextForAgent(params: {
    agentType: string;
    taskType?: string;
    maxMemories?: number;
  }): Memory[] {
    const maxMemories = params.maxMemories || 10;

    // Query bucketing: only retrieve relevant memory types
    const relevantTypes = this.getRelevantTypesForAgent(params.agentType);

    let memories: Memory[] = [];
    for (const type of relevantTypes) {
      memories.push(...this.retrieveByType(type));
    }

    // Sort by access frequency and recency
    memories.sort((a, b) => {
      const scoreA = a.accessCount + (Date.now() - a.lastAccessed.getTime()) / 1000000;
      const scoreB = b.accessCount + (Date.now() - b.lastAccessed.getTime()) / 1000000;
      return scoreB - scoreA;
    });

    // Limit to max memories for context efficiency
    const compacted = memories.slice(0, maxMemories);

    logger.debug('Context compacted for agent', {
      agentType: params.agentType,
      totalMemories: memories.length,
      compactedMemories: compacted.length
    });

    return compacted;
  }

  /**
   * Summarize memories for long-term distillation
   */
  summarizeMemories(memoryIds: string[]): string {
    const memories = memoryIds
      .map(id => this.memories.get(id))
      .filter((m): m is Memory => m !== undefined);

    // Group by type
    const grouped = new Map<string, Memory[]>();
    memories.forEach(m => {
      if (!grouped.has(m.type)) {
        grouped.set(m.type, []);
      }
      grouped.get(m.type)!.push(m);
    });

    // Generate summary
    let summary = 'Memory Summary:\n';
    for (const [type, mems] of grouped.entries()) {
      summary += `\n${type.toUpperCase()} (${mems.length}):\n`;
      mems.slice(0, 5).forEach(m => {
        summary += `  - ${JSON.stringify(m.content).substring(0, 100)}...\n`;
      });
    }

    return summary;
  }

  /**
   * Get statistics about stored memories
   */
  getStats(): {
    totalMemories: number;
    byType: Record<string, number>;
    mostAccessed: Memory[];
    oldestMemories: Memory[];
  } {
    const byType: Record<string, number> = {};
    for (const [type, ids] of this.typeIndex.entries()) {
      byType[type] = ids.size;
    }

    const allMemories = Array.from(this.memories.values());
    const mostAccessed = [...allMemories]
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 5);

    const oldestMemories = [...allMemories]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(0, 5);

    return {
      totalMemories: this.memories.size,
      byType,
      mostAccessed,
      oldestMemories
    };
  }

  /**
   * Clear all memories
   */
  clearAll() {
    this.memories.clear();
    this.typeIndex.clear();
    this.embeddings.clear();
    logger.info('All memories cleared');
  }

  // Helper methods

  private getRelevantTypesForAgent(agentType: string): Memory['type'][] {
    const typeMapping: Record<string, Memory['type'][]> = {
      'bill': ['bill', 'preference', 'task_history'],
      'document': ['document', 'preference', 'task_history'],
      'subscription': ['subscription', 'preference', 'task_history'],
      'appointment': ['appointment', 'preference', 'task_history'],
      'deadline': ['bill', 'document', 'subscription', 'appointment', 'task_history'],
      'orchestrator': ['bill', 'document', 'subscription', 'appointment', 'preference', 'task_history']
    };

    return typeMapping[agentType] || ['preference', 'task_history'];
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    // Mock embedding generation - in production would use OpenAI embeddings API
    // or a local embedding model
    const embedding: number[] = [];
    for (let i = 0; i < 128; i++) {
      embedding.push(Math.random());
    }
    return embedding;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
