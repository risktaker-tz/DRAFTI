import importlib.util, pathlib, tempfile, wave
import numpy as np
ROOT = pathlib.Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('voice_proc', ROOT / 'scripts/voice_proc.py')
processor = importlib.util.module_from_spec(spec); spec.loader.exec_module(processor)
with tempfile.TemporaryDirectory() as folder:
    folder = pathlib.Path(folder)
    source, destination = folder / 'signal.wav', folder / 'processed.mp3'
    rate = processor.RATE
    signal = .3 * np.sin(2*np.pi*440*np.arange(rate)/rate)
    samples = np.concatenate([np.zeros(rate), signal, np.zeros(rate)])
    with wave.open(str(source), 'wb') as out:
        out.setnchannels(1); out.setsampwidth(2); out.setframerate(rate)
        out.writeframes((samples*32767).astype('<i2').tobytes())
    result = processor.process(source, destination, processor.ffmpeg_path())
    assert 1.33 < result['seconds'] < 1.35, result
    assert result['peakDbFS'] <= -1.48, result
    assert result['bytes'] < 61440, result
    try: processor.process(source, destination, processor.ffmpeg_path())
    except FileExistsError: pass
    else: raise AssertionError('Existing output was not protected')
    try: processor.process(source, folder/'too-long.mp3', processor.ffmpeg_path(), maximum=.5)
    except ValueError as error: assert 'no speech was cut' in str(error)
    else: raise AssertionError('Overlong speech was not rejected')
    print('Audio processing passed: padding, encoded peak, size, overwrite protection and duration guard', result)
