import { spawn } from "child_process";
import * as path from "path";
import * as fs from "fs";
import { Stem, StemType } from "./Stem.js";

type SeparatorStatus = {
    percent?: number;
    usingGpu?: boolean;
};

type ProgressCallback = (status: SeparatorStatus) => void;

export class AudioSeparator {
    constructor(protected readonly outputDir: string) { }

    getStemType(filePath: string): StemType {
        const name = path.basename(filePath).toLowerCase();
        if (/dereverb|no.?reverb/.test(name)) return StemType.VOCALS_DEREVERB;
        if (/vocal|voice/.test(name)) return StemType.VOCALS;
        if (/instrumental|accompaniment|no.?vocal/.test(name)) return StemType.INSTRUMENTAL;
        if (/bass/.test(name)) return StemType.BASS;
        if (/drums/.test(name)) return StemType.DRUMS;
        if (/guitar/.test(name)) return StemType.GUITAR;
        if (/piano/.test(name)) return StemType.PIANO;
        return StemType.UNKNOWN;
    }

    async runSeparator(
        inputFile: string,
        modelFile: string,
        options?: {
            extraArgs?: string[],
            onProgress?: ProgressCallback,
        }
    ): Promise<Stem[]> {
        // making sure the temp folder exist
        await fs.promises.mkdir(this.outputDir, { recursive: true });

        const startTime = Date.now();

        return new Promise((resolve, reject) => {
            let usingGpu: boolean | undefined = undefined;
            let stderr = "";

            console.log(`[AudioSeparator] Output dir: ${this.outputDir}`);

            const { extraArgs = [], onProgress } = options ?? {};

            const proc = spawn("audio-separator", [
                inputFile, "-m", modelFile,
                "--output_dir", this.outputDir,
                "--output_format", "wav",
                ...extraArgs
            ]);

            proc.stderr.on("data", (d: Buffer) => {
                const text = d.toString();
                stderr += text;

                if (usingGpu === undefined) {
                    if (text.includes("CUDAExecutionProvider") || text.includes("device=cuda") || text.includes("CUDA")) {
                        usingGpu = true;
                    } else if (text.includes("No hardware acceleration could be configured")) {
                        usingGpu = false;
                    }
                }

                const progress = text.match(/^\s*(\d{1,3})%\|/m) ?? text.match(/(\d+)%/);
                if (progress) {
                    onProgress?.({ percent: parseInt(progress[1], 10), usingGpu });
                }
            });

            proc.on("close", async (code) => {
                if (code !== 0) {
                    console.error(`[AudioSeparator] Exit code ${code}\n${stderr}`);
                    reject(new Error(`audio-separator failed (${code})\n${stderr}`));
                    return;
                }

                try {
                    const files = await fs.promises.readdir(this.outputDir);
                    const stems = files
                        .filter(f => {
                            if (!f.endsWith(".wav")) return false;
                            const stat = fs.statSync(path.join(this.outputDir, f));
                            return stat.mtimeMs >= startTime;
                        })
                        .map(f => new Stem(this.getStemType(f), path.join(this.outputDir, f)));

                    if (stems.length === 0) {
                        reject(new Error(`audio-separator succeeded but no new WAV files found in ${this.outputDir}\nFull stderr:\n${stderr}`));
                        return;
                    }

                    console.log(`[AudioSeparator] Found ${stems.length} stem(s):`, stems.map(s => s.path));
                    resolve(stems);
                } catch (e) {
                    reject(e);
                }
            });

            proc.on("error", (err) => {
                console.error("[AudioSeparator] Spawn error:", err);
                reject(err);
            });
        });
    }
}