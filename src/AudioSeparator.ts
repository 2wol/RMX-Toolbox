import { spawn } from "child_process";
import * as path from "path";
import { Stem, StemType } from "./Stem.js";

type SeparatorStatus = {
    percent?: number;
    usingGpu?: boolean;
};

type ProgressCallback = (status: SeparatorStatus) => void;

export class AudioSeparator {
    constructor(protected readonly outputDir: string) { }

    // guess stem type using regex
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

    runSeparator(
        inputFile: string,
        modelFile: string,
        options?: {
            extraArgs?: string[],
            onProgress?: ProgressCallback,
        }
    ): Promise<Stem[]> {
        return new Promise((resolve, reject) => {
            let usingGpu: boolean | undefined = undefined;

            const {
                extraArgs = [],
                onProgress,
            } = options ?? {};

            const proc = spawn("audio-separator", [
                inputFile, "-m", modelFile,
                "--output_dir", this.outputDir,
                "--output_format", "wav",
                ...extraArgs
            ]);

            let stderr = "";

            proc.stderr.on("data", (d: Buffer) => {
                const text = d.toString();
                stderr += text;

                if (
                    usingGpu === undefined &&
                    (
                        text.includes("CUDAExecutionProvider") ||
                        text.includes("device=cuda") ||
                        text.includes("CUDA")
                    )
                ) {
                    usingGpu = true;
                }

                if (
                    usingGpu === undefined &&
                    text.includes("No hardware acceleration could be configured")
                ) {
                    usingGpu = false;
                }

                const progress = text.match(/^\s*(\d{1,3})%\|/m);
                if (progress) onProgress?.({
                    percent: parseInt(progress[1]),
                    usingGpu
                });

                const output = text.match(/Output file\(s\): (.+)$/m);
                if (output) {
                    const files = output[1].trim().split(/(?<=\.wav)\s+/);
                    resolve(files.map(f => new Stem(this.getStemType(f), path.join(this.outputDir, f.trim()))));
                }

                // another fallback :/
                const match = text.match(/(\d+)%/);
                if (match) {
                    onProgress?.({
                        percent: parseInt(match[1], 10),
                        usingGpu
                    });
                }
            });

            proc.on("close", (code) => {
                if (code !== 0) reject(new Error(`audio-separator failed (${code})\n${stderr}`));
            });

            proc.on("error", (err) => reject(err));
        });
    }
}