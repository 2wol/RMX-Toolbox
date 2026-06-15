import { AudioClip, Handle, initialize, type ActivationContext } from "@ableton-extensions/sdk";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";

import { Importer } from "./Importer.js";
import { YouTubeDownloader } from "./YouTubeDownloader.js";
import { AudioSeparator } from "./AudioSeparator.js";

import bundledInterface from "../ui/youtube_downloader.html";

export function activate(activation: ActivationContext) {
  const context = initialize(activation, "1.0.0");

  const outputDir = path.join(
    context.environment.tempDirectory ? context.environment.tempDirectory : os.tmpdir(),
    "rmx-toolbox"
  );

  const importer = new Importer(context);
  const downloader = new YouTubeDownloader(outputDir);
  const audioSeparator = new AudioSeparator(outputDir);

  context.commands.registerCommand("rmx-toolbox.yt-dl-start", async () => {
    const url = `data:text/html,${encodeURIComponent(bundledInterface)}`;
    const result = await context.ui.showModalDialog(url, 280, 220);

    if (result === null || result.length === 0) {
      console.error("[Extension] result is null.");
      return;
    }

    const dialog = JSON.parse(result) as {
      url: string | null;
      cancelled: boolean;
    };

    if (dialog.cancelled || !dialog.url) {
      return;
    }

    try {
      await context.ui.withinProgressDialog("YouTube Downloader", {}, async (update) => {
        update("Downloading audio from YouTube...");
        const wavFile = await downloader.download(dialog.url!); // using ! as we check it before, it's should be safe :)

        update("Importing...");
        await importer.importStems([wavFile]);

        update("Done!", 100);
      });
    } catch (e) {
      console.error(`[Extension (YouTube Downloader)] Error occured: ${e}`);
    }
  });

  // Handle is AudioClip
  context.commands.registerCommand("rmx-toolbox.stem-separator", async (handle) => {
    const clip = context.getObjectFromHandle(handle as Handle, AudioClip);
    const clipPath = clip.filePath;

    await context.ui.withinProgressDialog(`Stem Separation (UVR-MDX-NET-Voc_FT)`, {}, async (update) => {
      const stems = await audioSeparator.runSeparator(clipPath, "UVR-MDX-NET-Voc_FT.onnx", {
        onProgress: ({percent, usingGpu}) => {
          const gpu_usage = usingGpu === true ? `GPU` : usingGpu === false ? `Warn: Using CPU` : `Detecting...`;
          update(`Stem Separation (${gpu_usage})`, percent);
        },
      }
      );

      update("Importing...");
      await importer.importStems(stems);
    });
  });

  context.commands.registerCommand("rmx-toolbox.dereverb", async (handle) => {
    const clip = context.getObjectFromHandle(handle as Handle, AudioClip);
    const clipPath = clip.filePath;

    await context.ui.withinProgressDialog(`DeReverb (UVR-DeEcho-DeReverb)`, {}, async (update) => {
      const stems = await audioSeparator.runSeparator(clipPath, "UVR-DeEcho-DeReverb.pth", {
        extraArgs: ["--single_stem", "No Reverb"],
        onProgress: ({percent, usingGpu}) => {
          const gpu_usage = usingGpu === true ? `GPU` : usingGpu === false ? `Warn: Using CPU` : `Detecting...`;
          update(`DeReverb/DeEcho (${gpu_usage})`, percent);
        },
      }
      );

      update("Importing...");
      await importer.importStems(stems);
    });
  });

  context.ui.registerContextMenuAction(
    "AudioClip",
    "Stem Separator",
    "rmx-toolbox.stem-separator",
  );

  context.ui.registerContextMenuAction(
    "AudioClip",
    "DeReverb",
    "rmx-toolbox.dereverb",
  );

  context.ui.registerContextMenuAction(
    "AudioTrack",
    "YouTube Download",
    "rmx-toolbox.yt-dl-start",
  );
}