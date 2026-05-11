import * as fs from 'fs/promises';
import * as path from 'path';
import { z } from 'zod';

// Schema for validation
export const ReadFileSchema = z.object({ filePath: z.string() });
export const WriteFileSchema = z.object({ filePath: z.string(), content: z.string() });
export const ListDirSchema = z.object({ dirPath: z.string() });

export class FSTool {
  async readFile(params: z.infer<typeof ReadFileSchema>) {
    try {
      const absolutePath = path.resolve(process.cwd(), params.filePath);
      return await fs.readFile(absolutePath, 'utf-8');
    } catch (error: unknown) {
      throw new Error(`FS Error (Read): ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async writeFile(params: z.infer<typeof WriteFileSchema>) {
    try {
      const absolutePath = path.resolve(process.cwd(), params.filePath);
      const dir = path.dirname(absolutePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(absolutePath, params.content, 'utf-8');
      return `File written successfully to ${params.filePath}`;
    } catch (error: unknown) {
      throw new Error(`FS Error (Write): ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async listDir(params: z.infer<typeof ListDirSchema>) {
    try {
      const absolutePath = path.resolve(process.cwd(), params.dirPath);
      return await fs.readdir(absolutePath);
    } catch (error: unknown) {
      throw new Error(`FS Error (List): ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export const fsTool = new FSTool();