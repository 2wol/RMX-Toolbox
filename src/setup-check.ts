import { exec } from 'child_process';
import { promisify } from 'util';
import type { ExtensionContext } from '@ableton-extensions/sdk';

import bundledInterface from "../ui/setup_check.html";

const execAsync = promisify(exec);

interface Tool {
    name: string,
    command: string
}

const TOOLS: Tool[] = [
    {
        name: "Python 3.11",
        command: "python3.11"
    },
    {
        name: "yt-dlp",
        command: "yt-dlp"
    },
    {
        name: "FFmpeg",
        command: "ffmpeg"
    }
];

async function check(tool: Tool): Promise<{ valid: boolean, version?: string }> {
    try {
        const { stdout } = await execAsync(`${tool.command} 2>&1`);
        return { valid: true, version: stdout.trim().split("\n")[0] };
    } catch {
        return { valid: false };
    }
}

export async function runSetupCheck(context: ExtensionContext<"1.0.0">): Promise<boolean> {
    const results = await Promise.all(TOOLS.map((tool) => check(tool)));
    const missing = TOOLS.filter((_, i) => !results[i].valid);

    if (missing.length === 0) {
        console.log("[Setup Check] OK");
        return true;
    }

    console.warn("[Setup Check] Missing packages: ", missing.map((tool) => tool.name).join(", "));

    const params = new URLSearchParams({
        missing: JSON.stringify(missing.map(tool => ({ name: tool.name })))
    });

    await context.ui.showModalDialog(
        `data:text/html,${encodeURIComponent(bundledInterface)}?${params}`,
        480,
        320
    );

    return false;
}