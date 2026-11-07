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
import subprocess
import threading
import time
import urllib.error
import urllib.request

import modal

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
# The finished song split in two with Demucs (htdemucs, MIT): the same recording without
# the voices (instrumental, to sing or read along to) and the voices alone (to learn the
# parts). ACE-Step's own track extraction needs its slower base model, so it isn't used.
# song-writer calls this after a song is made (and for older songs on first open).
separator_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg")
    .pip_install(
        "torch==2.5.1",
        "torchaudio==2.5.1",
        "demucs==4.0.1",
        "soundfile==0.12.1",
        "lameenc==1.7.0",
        "fastapi[standard]==0.115.6",
    )
    .env({"TORCH_HOME": "/models/torch"})
)


@app.function(
    image=separator_image,
    gpu="T4",
    volumes={"/models": models},
    secrets=[modal.Secret.from_name("ace-step-api")],
    timeout=600,
    scaledown_window=120,
    max_containers=2,
)
@modal.fastapi_endpoint(method="POST")
def separate(body: dict):
    """
    POST {"url": "<the song's mp3>", "key": "<the server key>"}. Answers
    {"instrumental": <base64 mp3>, "vocals": <base64 mp3>, "seconds": <time taken>}.
    """
    import base64
    import hmac
    import pathlib
    import tempfile
    import urllib.request as req

    from fastapi import HTTPException

    key = os.environ.get("ACESTEP_API_KEY", "")
    given = str(body.get("key", ""))
    if not key or not hmac.compare_digest(given, key):
        raise HTTPException(status_code=401, detail="Not allowed")
    url = str(body.get("url", ""))
    if not url.startswith("https://"):
        raise HTTPException(status_code=400, detail="Give the song's https address")

    started = time.time()
    work = pathlib.Path(tempfile.mkdtemp())
    song = work / "song.mp3"
    with req.urlopen(url, timeout=60) as res:
        song.write_bytes(res.read(60 * 1024 * 1024))
    run = subprocess.run(
        ["python", "-m", "demucs", "--two-stems=vocals", "-n", "htdemucs", "--mp3", "--mp3-bitrate", "192", "-o", str(work / "out"), str(song)],
        capture_output=True,
        text=True,
    )
    folder = work / "out" / "htdemucs" / "song"
    music, voices = folder / "no_vocals.mp3", folder / "vocals.mp3"
    if run.returncode != 0 or not music.exists() or not voices.exists():
        raise HTTPException(status_code=500, detail=f"Couldn't split the song: {(run.stderr or run.stdout)[-400:]}")
    models.commit()  # keep the separation model on the volume for next time
    return {
        "instrumental": base64.b64encode(music.read_bytes()).decode(),
        "vocals": base64.b64encode(voices.read_bytes()).decode(),
        "seconds": round(time.time() - started, 1),
    }
