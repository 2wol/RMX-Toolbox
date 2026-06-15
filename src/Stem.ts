import path from 'path'
import fs from 'fs'

export enum StemType {
    ORIGINAL,
    VOCALS,
    VOCALS_DEREVERB,
    INSTRUMENTAL,
    DRUMS,
    BASS,
    GUITAR,
    PIANO,
    UNKNOWN
}

export class Stem {
    constructor(
        public readonly type: StemType,
        public readonly path: string,
    ) {}

    get trackName(): string {
        var name = "";
        if (fs.existsSync(this.path)) {
            name = path.parse(this.path).name;
        }

        switch (this.type) {
            case StemType.ORIGINAL: return `${name} (Original)`;
            case StemType.VOCALS: return `${name} (Vocals)`;
            case StemType.VOCALS_DEREVERB: return `${name} (Vocals) (De-Reverb)`;
            case StemType.INSTRUMENTAL: return `${name} (Instrumental)`;
            default: return "Idk bro name it yourself";
        }
    }
}