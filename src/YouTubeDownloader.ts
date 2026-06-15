import { execFile } from "child_process";
import { promisify } from "util";
import * as path from "path";
import * as fs from "fs";

import { Stem, StemType } from "./Stem.js";

const execFileAsync = promisify(execFile);

export class YouTubeDownloader {
    constructor(private readonly outputDir: string) {}

    async download(url: string): Promise<Stem> {
        // making sure the temp folder exist
        await fs.promises.mkdir(this.outputDir, { recursive: true });
        
        const outputTemplate = path.join(this.outputDir, "%(title)s.%(ext)s");
        
        const { stdout } = await execFileAsync("yt-dlp", [
            "--extract-audio",
            "--audio-format", "wav",
            "--audio-quality", "0",
            "--no-playlist",
            "--no-continue",
            "--print", "after_move:filepath",
            "--output", outputTemplate,
            url
        ]);

        // Try to get a file that yt-dlp spit out.
        const wavFile = stdout.trim();
        if (wavFile && fs.existsSync(wavFile)) {
            console.log(`[YouTubeDownloader] Done: ${wavFile}`);
            return new Stem(StemType.ORIGINAL, wavFile);
        }

        console.error(`[YouTubeDownloader] yt-dlp returned [${wavFile}] -> falling back to the newest file available in output folder!`);
        return new Stem(StemType.ORIGINAL, this.getNewestFileIn(this.outputDir));
    }

    private getNewestFileIn(directory: string): string {
        const files = fs.readdirSync(directory).filter(f => f.endsWith(".wav"));

        if (files.length === 0) {
            throw new Error(`[YouTubeDownloader] Hell nah bro something big is wrong. Check if you have FFmpeg installed bro?!!? or idk.`);
        }

        const newestFile = files
            .map(f => ({f, t: fs.statSync(path.join(directory, f)).mtimeMs}))
            .sort((a, b) => b.t - a.t)[0].f;
        
        return path.join(directory, newestFile);
    }
}