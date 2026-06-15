import { initialize, type ActivationContext } from "@ableton-extensions/sdk";
import { runSetupCheck } from "./setup-check.js";
// esbuild inlines this HTML file as a string for production builds.
import bundledInterface from "../ui/youtube_downloader.html";

export function activate(activation: ActivationContext) {
  const context = initialize(activation, "1.0.0");

  context.commands.registerCommand("rmx-toolbox.start", () => {

    runSetupCheck(context).then((pass) => {
      if (!pass) {
        return;
      }
    });

    const url = `data:text/html,${encodeURIComponent(bundledInterface)}`;
    context.ui.showModalDialog(url, 320, 160).then((result) => {
      console.log(`Dialog closed with: ${result}`);
    });
  });

  context.ui.registerContextMenuAction(
    "AudioTrack",
    "RMX Toolbox",
    "rmx-toolbox.showDialog",
  );

  context.ui.registerContextMenuAction(
    "AudioTrack.ArrangementSelection",
    "RMX Toolbox",
    "rmx-toolbox.start",
  );
}
