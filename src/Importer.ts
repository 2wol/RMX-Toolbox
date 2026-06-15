import type { ExtensionContext } from "@ableton-extensions/sdk";
import { Stem, StemType } from "./Stem.js";
import Path from 'path'

export class Importer {
    constructor(
        private readonly context: ExtensionContext<any>
    ) {}

    async importStems(stems: Stem[]): Promise<void> {
        for (const stem of stems) {
            const importedPath = await this.context.resources.importIntoProject(stem.path);
            const track = await this.context.application.song.createAudioTrack();

            track.name = stem.trackName;
            const clip = await track.createAudioClip({
                filePath: importedPath,
                startTime: 0,
                isWarped: stem.type === StemType.INSTRUMENTAL || stem.type === StemType.ORIGINAL
                // isWarped on Vocals doesn't make sense, Ableton will detect wrong BPM anyway.
            });

            clip.name = stem.trackName;
        }
    }
}