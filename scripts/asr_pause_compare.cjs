'use strict';
// Optional research verification. Never imported by the offline game.
// Uses the existing tooling dependencies and cached tiny.en ONNX files.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { execFileSync } = require('child_process');
const { pathToFileURL } = require('url');
const root = path.resolve(__dirname, '..');
const ort = require('./tooling/node_modules/onnxruntime-web');
ort.env.wasm.numThreads = 1;
globalThis[Symbol.for('onnxruntime')] = ort;
const { pipeline, env } = require('./tooling/node_modules/@huggingface/transformers/dist/transformers.node.cjs');

async function main() {
  env.useWasmCache = false; // Node cannot import the browser-only blob factory.
  env.backends.onnx.wasm.wasmPaths = pathToFileURL(path.join(__dirname, 'tooling/node_modules/onnxruntime-web/dist/')).href;
  env.cacheDir = path.join(__dirname, 'tooling/onnx-models');
  env.allowRemoteModels = false;
  env.localModelPath = env.cacheDir + '/';
  const model = path.join(env.cacheDir, 'onnx-community/whisper-tiny.en/onnx/decoder_model_merged_quantized.onnx');
  const modelHash = crypto.createHash('sha256').update(fs.readFileSync(model)).digest('hex');
  if (modelHash !== 'c0592d0749413c960569e1c7fb806b060d5d18f3ebad4a95cbf9a77dc6e9be52')
    throw Error('Cached decoder differs from the verified publisher hash');
  const asr = await pipeline('automatic-speech-recognition', 'onnx-community/whisper-tiny.en', {
    device: 'auto', dtype: 'q8', session_options: { executionProviders: ['wasm'], intraOpNumThreads: 1, interOpNumThreads: 1 },
  });
  const fixes = JSON.parse(fs.readFileSync(path.join(__dirname, 'audio_processing_fixes.json')));
  const report = { model: 'onnx-community/whisper-tiny.en q8, WebAssembly CPU, one thread', modelHash,
    source: 'https://huggingface.co/onnx-community/whisper-tiny.en/blob/main/onnx/decoder_model_merged_quantized.onnx',
    scope: 'ASR corroboration only. Recognition differences must be reported; not listening certification.', results: [] };
  const output = process.argv[2] || path.join(root, 'docs/audio-pause-transcripts.json');
  for (const fix of fixes) {
    const result = { id: fix.id };
    for (const [label, file, expectedHash] of [
      ['original', path.resolve(root, fix.backup), fix.sourceSha256],
      ['processed', path.join(root, 'src/audio', fix.id + '.mp3'), fix.processedSha256],
    ]) {
      if (crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') !== expectedHash)
        throw Error('Recording changed before transcription: ' + fix.id);
      const pcm = execFileSync(path.join(__dirname, 'tooling/node_modules/ffmpeg-static/ffmpeg.exe'),
        ['-v', 'error', '-i', file, '-ac', '1', '-ar', '16000', '-f', 'f32le', 'pipe:1']);
      const aligned = Uint8Array.from(pcm);
      result[label] = await asr(new Float32Array(aligned.buffer));
    }
    report.results.push(result);
    fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(result));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
