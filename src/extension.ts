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
  const downloader = new YouTubeDownloader(path.join(outputDir, "downloads"));
  const audioSeparator = new AudioSeparator(path.join(outputDir, "stems"));

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
    } catch (e: any) {
      ThrowError(e);
    }
  });

  // Handle is AudioClip
  context.commands.registerCommand("rmx-toolbox.separate-vocals", async (handle) => {
    const clip = context.getObjectFromHandle(handle as Handle, AudioClip);
    const clipPath = clip.filePath;

    const workTitle = "Izolating Vocals";
    const modelName = "UVR-MDX-NET-Voc_FT";
    const modelPath = "UVR-MDX-NET-Voc_FT.onnx";

    await context.ui.withinProgressDialog(`${workTitle} (${modelName})`, {}, async (update) => {
      try {
        const stems = await audioSeparator.runSeparator(clipPath, modelPath, {
          extraArgs: ["--single_stem", "Vocals"],
          onProgress: ({ percent, usingGpu }) => {
            const gpu_usage = usingGpu === true ? `GPU` : usingGpu === false ? `Warn: Using CPU` : `Detecting...`;
            update(`Izolating Vocals (${gpu_usage})`, percent);
          },
        }
        );

        update("Importing...");
        await importer.importStems(stems);
      } catch (e: any) {
        ThrowError(e);
      }
    });
  });

  context.commands.registerCommand("rmx-toolbox.dereverb", async (handle) => {
    const clip = context.getObjectFromHandle(handle as Handle, AudioClip);
    const clipPath = clip.filePath;

    const workTitle = "DeReverb & DeEcho";
    const modelName = "UVR-DeEcho-DeReverb";
    const modelPath = "UVR-DeEcho-DeReverb.pth";

    await context.ui.withinProgressDialog(`${workTitle} (${modelName})`, {}, async (update) => {
      try {
        const stems = await audioSeparator.runSeparator(clipPath, modelPath, {
          extraArgs: ["--single_stem", "No Reverb"],
          onProgress: ({ percent, usingGpu }) => {
            const gpu_usage = usingGpu === true ? `GPU` : usingGpu === false ? `Warn: Using CPU` : `Detecting...`;
            update(`${workTitle} (${gpu_usage})`, percent);
          },
        }
        );

        update("Importing...");
        await importer.importStems(stems);
      } catch (e: any) {
        ThrowError(e);
      }
    });
  });

  context.commands.registerCommand("rmx-toolbox.separate-instrumental", async (handle) => {
    const clip = context.getObjectFromHandle(handle as Handle, AudioClip);
    const clipPath = clip.filePath;

    const workTitle = "Separating Instrumental";
    const modelName = "UVR-MDX-NET-Inst_HQ_4";
    const modelPath = "UVR-MDX-NET-Inst_HQ_4.onnx";

    await context.ui.withinProgressDialog(`${workTitle} (${modelName})`, {}, async (update) => {
      try {
        const stems = await audioSeparator.runSeparator(clipPath, modelPath, {
          extraArgs: ["--single_stem", "Instrumental"],
          onProgress: ({ percent, usingGpu }) => {
            const gpu_usage = usingGpu === true ? `GPU` : usingGpu === false ? `Warn: Using CPU` : `Detecting...`;
            update(`${workTitle} (${gpu_usage})`, percent);
          },
        }
        );

        update("Importing...");
        await importer.importStems(stems);
      } catch (e: any) {
        ThrowError(e);
      }
    });
  });

  context.ui.registerContextMenuAction(
    "AudioClip",
    "Separate Vocals",
    "rmx-toolbox.separate-vocals",
  );

  context.ui.registerContextMenuAction(
    "AudioClip",
    "Separate Instrumental",
    "rmx-toolbox.separate-instrumental",
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

  function ThrowError(e: any) {
    const msg = e instanceof Error ? `${e.message}\n${e.stack}` : JSON.stringify(e);
    throw new Error(`[Extension] Error occured: ${msg}`);
  }
}