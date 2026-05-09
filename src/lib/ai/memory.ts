import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'mem0_storage.json');

export interface MemoryEntry {
  user: string;
  memory: string;
  timestamp: string;
}

export class MemoryEngine {
  private static instance: MemoryEngine;

  private constructor() {
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify([], null, 2), 'utf-8');
    }
  }

  public static getInstance(): MemoryEngine {
    if (!MemoryEngine.instance) {
      MemoryEngine.instance = new MemoryEngine();
    }
    return MemoryEngine.instance;
  }

  public async add(text: string, userId: string): Promise<void> {
    try {
      const data = await this.readDb();
      data.push({
        user: userId,
        memory: text,
        timestamp: new Date().toISOString()
      });
      await this.writeDb(data);
      console.log(`✅ Antigravity Memory Recorded (Node.js): ${text}`);
    } catch (error) {
      console.error(`❌ Memory Error: ${error}`);
    }
  }

  public async search(query: string, userId: string): Promise<string> {
    // Currently in Lite Mode as per mem0.py logic
    return "Memory search is active in Lite Mode (Node.js).";
  }

  private async readDb(): Promise<MemoryEntry[]> {
    const content = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(content);
  }

  private async writeDb(data: MemoryEntry[]): Promise<void> {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  }
}
