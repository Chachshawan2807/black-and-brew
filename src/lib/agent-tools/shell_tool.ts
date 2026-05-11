import { exec } from 'child_process';
import { promisify } from 'util';
import { z } from 'zod';

const execPromise = promisify(exec);
const ShellSchema = z.object({ command: z.string() });

export class ShellTool {
    async execute(params: z.infer<typeof ShellSchema>) {
        try {
            const { stdout, stderr } = await execPromise(params.command);
            return {
                stdout: stdout.trim(),
                stderr: stderr.trim(),
                success: !stderr
            };
        } catch (error: unknown) {
            const err = error as { stdout?: string; message: string };
            return {
                stdout: err.stdout?.trim() || '',
                stderr: err.message,
                success: false
            };
        }
    }
}

export const shellTool = new ShellTool();

export async function handleShellCommand(args: Record<string, unknown>) {
    return shellTool.execute(args as { command: string });
}