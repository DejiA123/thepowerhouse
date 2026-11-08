"""
The church's own music server: ACE-Step 1.5 (open source, MIT) on Modal's GPUs.

Compose a song → "Make the full song" sends the song here (song-writer edge function,
service 'acestep'). Modal's free plan includes $30 of computing a month; the server
sleeps when nobody is making music (no cost) and wakes on the next song.

It runs ACE-Step's own REST API server (POST /release_task, POST /query_result,
GET /v1/audio), protected by ACESTEP_API_KEY (the Modal secret "ace-step-api").
The models (~15 GB) are downloaded once into the "ace-step-checkpoints" volume.

Deployed by .github/workflows/deploy-music-server.yml (needs the repo secrets
MODAL_TOKEN_ID and MODAL_TOKEN_SECRET); that workflow also makes the key and gives
the server's address and key to the app (Supabase Vault, platform entry).
"""
import json
import os
import pathlib
import subprocess
import threading
import time
import urllib.error
import urllib.request

import modal
import modal.exception

# ACE-Step 1.5, pinned (Nov 2026); update deliberately
ACE_COMMIT = "ca1e85fe9430179831e6bc6be790c332190a3866"
PORT = 8001

image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("git", "ffmpeg", "libsndfile1", "build-essential")
    .pip_install("uv")
    .run_commands(
        f"git clone https://github.com/ace-step/ACE-Step-1.5 /opt/ace && cd /opt/ace && git checkout {ACE_COMMIT}",
        # ACE-Step's own locked environment (torch for CUDA 12.8, its bundled nano-vllm)
        "cd /opt/ace && uv sync --frozen --no-dev",
        # The models live on the volume, so they're downloaded only once
        "rm -rf /opt/ace/checkpoints && ln -s /models /opt/ace/checkpoints",
    )
    .env(
        {
            # The 4B "XL" turbo model: the best-sounding ACE-Step 1.5
            "ACESTEP_CONFIG_PATH": "acestep-v15-xl-turbo",
            # The planner that shapes the song from the lyrics ("thinking")
            "ACESTEP_INIT_LLM": "true",
            "ACESTEP_LM_MODEL_PATH": "acestep-5Hz-lm-1.7B",
            "ACESTEP_DOWNLOAD_SOURCE": "huggingface",
            "ACESTEP_OFFLOAD_TO_CPU": "false",
            "HF_HOME": "/models/hf-cache",
            "PYTHONUNBUFFERED": "1",
        }
    )
)

models = modal.Volume.from_name("ace-step-checkpoints", create_if_missing=True)
app = modal.App("church-ace-step")


@app.function(
    image=image,
    gpu="L4",
    volumes={"/models": models},
    secrets=[modal.Secret.from_name("ace-step-api")],
    timeout=3600,
    # Stay awake 5 minutes after the last song (so a second song is quick), then sleep
    scaledown_window=300,
    # One server: its job list lives in memory, so every request must reach the same one
    min_containers=0,
    max_containers=1,
)
@modal.concurrent(max_inputs=50)
@modal.web_server(PORT, startup_timeout=1800)
def server():
    proc = subprocess.Popen(
        f"cd /opt/ace && .venv/bin/acestep-api --host 0.0.0.0 --port {PORT}",
        shell=True,
    )
    threading.Thread(target=watchdog, args=(proc,), daemon=True).start()
    threading.Thread(target=warm_up, daemon=True).start()


# ── Studio quality (Compose a song → Advanced settings → Studio quality music) ──
# A second server for songs where the writer asks for the best music: ACE-Step's full XL
# model (xl-sft, 50 steps with guidance, instead of the fast 8-step turbo) with the 4B
# planner, which composes the melody and arrangement ("Strong" composition in ACE-Step's
# own model table, against "Medium" for the 1.7B planner). The two need ~20 GB, more than
# the L4 holds next to everything else, so it runs on an L40S (48 GB) and sleeps after 3
# idle minutes (it costs more of the free credit per minute than the everyday server).
studio_image = image.env(
    {
        "ACESTEP_CONFIG_PATH": "acestep-v15-xl-sft",
        "ACESTEP_LM_MODEL_PATH": "acestep-5Hz-lm-4B",
    }
)


@app.function(
    image=studio_image,
    gpu="L40S",
    volumes={"/models": models},
    secrets=[modal.Secret.from_name("ace-step-api")],
    timeout=3600,
    scaledown_window=180,
    min_containers=0,
    max_containers=1,
)
@modal.concurrent(max_inputs=50)
@modal.web_server(PORT, startup_timeout=1800)
def studio():
    proc = subprocess.Popen(
        f"cd /opt/ace && .venv/bin/acestep-api --host 0.0.0.0 --port {PORT}",
        shell=True,
    )
    threading.Thread(target=watchdog, args=(proc,), daemon=True).start()
    threading.Thread(target=warm_up, daemon=True).start()


def warm_up():
    """
    Loads the models as soon as the server answers, before any song comes. ACE-Step loads
    them on the first song otherwise, and a song sent while they load hung for minutes
    (Nov 2026); song-writer now waits until /health says they're loaded before sending.
    """
    key = os.environ.get("ACESTEP_API_KEY", "")
    headers = {"Content-Type": "application/json", **({"Authorization": f"Bearer {key}"} if key else {})}
    for _ in range(120):  # up to 10 minutes for the API to start
        try:
            urllib.request.urlopen(f"http://127.0.0.1:{PORT}/health", timeout=10)
            break
        except urllib.error.HTTPError:
            break
        except Exception:
            time.sleep(5)
    body = json.dumps({"init_llm": True, "lm_model_path": os.environ.get("ACESTEP_LM_MODEL_PATH", "acestep-5Hz-lm-1.7B")}).encode()
    try:
        req = urllib.request.Request(f"http://127.0.0.1:{PORT}/v1/init", data=body, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=1200) as res:
            print("[warm_up] models loaded:", res.read()[:300], flush=True)
    except Exception as e:
        print("[warm_up] couldn't load the models:", e, flush=True)


def watchdog(proc):
    """
    Restarts the server if it hangs. With one server allowed (max_containers=1), a hung
    one made every new song wait behind it (Nov 2026: 30 minutes, until a redeploy). If
    the API process dies, or stops answering /health for 8 minutes (longer than any song
    takes), the container exits and Modal starts a fresh one; song-writer then finds the
    song missing and sends it again.
    """
    time.sleep(300)  # starting up and loading the models
    silent = 0
    while True:
        time.sleep(30)
        if proc.poll() is not None:
            print("[watchdog] the API process stopped; restarting the container", flush=True)
            os._exit(1)
        try:
            urllib.request.urlopen(f"http://127.0.0.1:{PORT}/health", timeout=20)
            silent = 0
        except urllib.error.HTTPError:
            silent = 0  # it answered (e.g. asks for the key): alive
        except Exception:
            silent += 1
            if silent >= 16:
                print("[watchdog] no answer for 8 minutes; restarting the container", flush=True)
                os._exit(1)


# ── Music only / voices only (Compose a song) ─────────────────────────────
# The finished song split in two: the same recording without the voices (instrumental, to
# sing or read along to) and the voices alone (to learn the parts). Demucs (htdemucs) left
# an audible "ghost" of the voices and thinned the instruments, so (Nov 2026) the split is
# made by the music-separation community's cleanest instrumental pair, "Instrumental
# Clean" in python-audio-separator (MIT): Gabox's MelBand-RoFormer Fv7z (the least voice
# bleed) with unwa's BS-RoFormer Resurrection Inst (the fullest), merged spectrally
# (uvr_max_spec). If that fails, ByteDance/viperx's BS-RoFormer (SDR 12.97) alone.
# song-writer calls `separate` after a song is made (and for older songs on first open).
# A split runs as a job (`split_song`): `separate` waits for it up to `wait` seconds, then
# answers 202 and the next call picks up the same job, so a slow first split (models
# downloading) is never thrown away.
separator_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg")
    .pip_install(
        "torch==2.5.1",
        "torchaudio==2.5.1",
        # onnx2torch (needed by audio-separator) asks for any torchvision; the newest needs
        # a newer torch, so keep the one made for torch 2.5.1
        "torchvision==0.20.1",
        "audio-separator[gpu]==0.48.0",
        "fastapi[standard]==0.115.6",
    )
)
SEPARATION_MODELS = "/models/separator"
SPLIT_FALLBACK = "model_bs_roformer_ep_317_sdr_12.9755.ckpt"
splits = modal.Dict.from_name("song-splits", create_if_missing=True)


def _split(song: str, out: str, preset: str | None):
    """Instrumental and vocals WAVs of one recording (an ensemble preset, or the fallback)"""
    from audio_separator.separator import Separator

    sep = Separator(
        model_file_dir=SEPARATION_MODELS,
        output_dir=out,
        output_format="WAV",
        ensemble_preset=preset,
    )
    sep.load_model() if preset else sep.load_model(SPLIT_FALLBACK)
    files = [f if os.path.isabs(f) else os.path.join(out, f) for f in sep.separate(song)]
    music = next((f for f in files if "(instrumental)" in f.lower()), None)
    voices = next((f for f in files if "(vocals)" in f.lower()), None)
    if not music or not voices:
        raise RuntimeError(f"unexpected stems: {[os.path.basename(f) for f in files]}")
    return music, voices


def _mp3(wav: str) -> bytes:
    mp3 = wav.rsplit(".", 1)[0] + ".mp3"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-codec:a", "libmp3lame", "-b:a", "192k", mp3], check=True)
    return pathlib.Path(mp3).read_bytes()


@app.function(
    image=separator_image,
    gpu=["L4", "T4"],
    volumes={"/models": models},
    timeout=900,
    scaledown_window=120,
    max_containers=2,
)
def split_song(url: str) -> dict:
    import base64
    import tempfile
    import urllib.request as req

    started = time.time()
    work = pathlib.Path(tempfile.mkdtemp())
    song = work / "song.mp3"
    # The media store (Cloudflare) refuses Python's default user agent (403)
    download = req.Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; ChurchSpace-music/1.0)"})
    with req.urlopen(download, timeout=60) as res:
        song.write_bytes(res.read(60 * 1024 * 1024))
    try:
        model = "instrumental_clean"
        music, voices = _split(str(song), str(work / "clean"), model)
    except Exception as e:  # noqa: BLE001
        print(f"[separate] ensemble failed ({e}); using {SPLIT_FALLBACK}", flush=True)
        model = SPLIT_FALLBACK
        music, voices = _split(str(song), str(work / "single"), None)
    models.commit()  # keep the separation models on the volume for next time
    return {
        "instrumental": base64.b64encode(_mp3(music)).decode(),
        "vocals": base64.b64encode(_mp3(voices)).decode(),
        "seconds": round(time.time() - started, 1),
        "model": model,
    }


@app.function(
    image=modal.Image.debian_slim(python_version="3.11").pip_install("fastapi[standard]==0.115.6"),
    secrets=[modal.Secret.from_name("ace-step-api")],
    timeout=300,
    max_containers=2,
)
@modal.concurrent(max_inputs=8)
@modal.fastapi_endpoint(method="POST")
def separate(body: dict):
    """
    POST {"url": "<the song's mp3>", "key": "<the server key>", "wait": <seconds, ≤240>}.
    Answers {"instrumental": <base64 mp3>, "vocals": <base64 mp3>, "seconds", "model"}, or
    202 {"status": "working"} while the split is still being made (ask again later).
    """
    import hashlib
    import hmac

    from fastapi import HTTPException
    from fastapi.responses import JSONResponse

    key = os.environ.get("ACESTEP_API_KEY", "")
    given = str(body.get("key", ""))
    if not key or not hmac.compare_digest(given, key):
        raise HTTPException(status_code=401, detail="Not allowed")
    url = str(body.get("url", ""))
    if not url.startswith("https://"):
        raise HTTPException(status_code=400, detail="Give the song's https address")
    try:
        wait = min(max(float(body.get("wait", 100)), 1.0), 240.0)
    except (TypeError, ValueError):
        wait = 100.0

    tag = hashlib.sha256(url.encode()).hexdigest()
    call = None
    known = splits.get(tag)
    if known:
        try:
            call = modal.FunctionCall.from_id(known)
        except Exception:  # noqa: BLE001
            call = None
    if call is None:
        call = split_song.spawn(url)
        splits[tag] = call.object_id
    asked = time.time()
    try:
        out = call.get(timeout=wait)
    except modal.exception.FunctionTimeoutError:
        splits.pop(tag, None)
        raise HTTPException(status_code=500, detail="Couldn't split the song: it took too long")
    except (TimeoutError, modal.exception.TimeoutError):
        if time.time() - asked < wait - 1:  # not our wait running out: the job itself failed
            splits.pop(tag, None)
            raise HTTPException(status_code=500, detail="Couldn't split the song")
        return JSONResponse({"status": "working"}, status_code=202)
    except Exception as e:  # noqa: BLE001
        splits.pop(tag, None)
        raise HTTPException(status_code=500, detail=f"Couldn't split the song: {str(e)[-400:]}")
    splits.pop(tag, None)
    return out


# ── The read-aloud Bible voice (non-narrated translations) ────────────────
# Kokoro-82M (Apache 2.0): a small, natural open-source reading voice, so listening has no
# daily allowance and costs only a little of the free Modal credit (a whole Bible is about
# an hour of a T4). bible-tts sends one piece of a chapter at a time (≈230 characters) and
# keeps every answer in the media store, so each piece is only ever read once for everybody.
voice_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("espeak-ng", "ffmpeg")
    .pip_install("kokoro==0.9.4", "soundfile==0.12.1", "fastapi[standard]==0.115.6")
    .run_commands("python -m spacy download en_core_web_sm")
    .env({"HF_HOME": "/models/hf-voice"})
)

_pipes = {}
_voice_lock = threading.Lock()


def _pipeline(lang: str):
    """Kokoro's English pipelines: 'a' American, 'b' British (made once per container)"""
    if lang not in _pipes:
        from kokoro import KPipeline

        _pipes[lang] = KPipeline(lang_code=lang, repo_id="hexgrad/Kokoro-82M")
    return _pipes[lang]


@app.function(
    image=voice_image,
    # Whichever is free first: waiting for a T4 alone made a cold start take 45 s+ once
    gpu=["T4", "L4"],
    volumes={"/models": models},
    secrets=[modal.Secret.from_name("ace-step-api")],
    timeout=300,
    # Awake 10 minutes after the last piece, so a listening session rarely waits for a
    # cold start (~28 s) between chapters
    scaledown_window=600,
    max_containers=2,
)
@modal.concurrent(max_inputs=8)
@modal.fastapi_endpoint(method="POST")
def speak(body: dict):
    """
    POST {"text": "...", "voice": "bm_george", "speed": 0.95, "key": "<server key>"} → MP3
    (24 kHz mono, 48 kbps). Kokoro voice ids: af_*/am_* American, bf_*/bm_* British.
    """
    import hmac

    import numpy as np
    from fastapi import HTTPException, Response

    key = os.environ.get("ACESTEP_API_KEY", "")
    if not key or not hmac.compare_digest(str(body.get("key", "")), key):
        raise HTTPException(status_code=401, detail="Not allowed")
    text = str(body.get("text", "")).strip()
    voice = str(body.get("voice", "bm_george"))
    if not text or len(text) > 2000 or not voice[:3] in ("af_", "am_", "bf_", "bm_"):
        raise HTTPException(status_code=400, detail="Give 1–2000 characters and a Kokoro voice")
    speed = min(1.3, max(0.7, float(body.get("speed", 0.95))))
    started = time.time()
    with _voice_lock:  # one reading at a time per container (the model isn't shared safely)
        pipe = _pipeline("b" if voice.startswith("b") else "a")
        parts = [a for _, _, a in pipe(text, voice=voice, speed=speed)]
    if not parts:
        raise HTTPException(status_code=500, detail="No speech")
    pcm = np.concatenate([p.detach().cpu().numpy() if hasattr(p, "detach") else np.asarray(p) for p in parts]).astype(np.float32)
    mp3 = subprocess.run(
        # Levelled to a steady, phone-friendly loudness (about -16 LUFS, peaks under -1.5 dB)
        ["ffmpeg", "-v", "quiet", "-f", "f32le", "-ar", "24000", "-ac", "1", "-i", "-", "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "24000", "-codec:a", "libmp3lame", "-b:a", "48k", "-f", "mp3", "-"],
        input=pcm.tobytes(),
        capture_output=True,
    ).stdout
    if not mp3:
        raise HTTPException(status_code=500, detail="Couldn't encode the speech")
    if not getattr(speak, "_committed", False):
        models.commit()  # keep the voice model on the volume for next time
        speak._committed = True
    return Response(content=mp3, media_type="audio/mpeg", headers={"X-Seconds": f"{len(pcm) / 24000:.2f}", "X-Took": f"{time.time() - started:.2f}"})
