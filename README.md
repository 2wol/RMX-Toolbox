
# Ableton YouTube Separator
Download audio from YouTube and separate them using audio-separator directly in Ableton (Extensions SDK).

## In progress dialog there is a message saying "(Warn: Using CPU)"

If you have an Nvidia GPU, here is the fix:

First, replace `audio-separator` `Torch 2.12.0` with `Torch 2.11.0+cu128` and check if the message pop up again.
```bash
pipx runpip audio-separator install --force-reinstall torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu128
```
If the message is still there, install [CUDA Toolkit 12.8.0](https://developer.nvidia.com/cuda-12-8-0-download-archive?target_os=Windows&target_arch=x86_64)


## Requirements
__Ableton Suite 12.4.5__ _or newer_

__Node.js__ _if you want to build the extension by yourself_

__yt-dlp__

__FFmpeg__

__Python 3.11__
## Installation
### Windows
1. Install Python 3.11 & pipx
```bash
winget install Python.Python.3.11
py -3.11 -m pip install pipx
py -3.11 -m pipx ensurepath

# now restart PowerShell
```

2. Install yt-dlp & FFmpeg
```bash
winget install yt-dlp.yt-dlp
winget install Gyan.FFmpeg
```

3. Install audio-separator
```bash
pipx install "audio-separator[gpu]"
```

4. Verify
```bash
yt-dlp --version
ffmpeg -version
audio-separator --help
```

### MacOS
1. Install [Homebrew](https://brew.sh/)
2. Install Python 3.11, pipx, yt-dlp & FFmpeg
```bash
brew install python@3.11 pipx yt-dlp ffmpeg
pipx ensurepath
```
3. Install audio-separator
```bash
pipx install "audio-separator[gpu]"
```
4. Verify
```bash
yt-dlp --version
ffmpeg -version
audio-separator --help
```
## Building
1. Clone Repository
```bash
git clone https://github.com/2wol/Ableton-YouTube-Separator.git
```
2. Open cloned repository in Visual Studio Code, open terminal and run this command to install missing packages
```bash
npm install
```
3. Create .env file in the root directory and specify Extension Host Node Module path in it
```
# Example:
EXTENSION_HOST_PATH=C:\ProgramData\Ableton\Live 12 Beta\Program\ExtensionHost\ExtensionHostNodeModule.node
```
4. Start for debugging or package minified build
```bash
npm start (or) npm run package
```
