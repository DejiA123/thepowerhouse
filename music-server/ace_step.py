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
import subprocess

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
    subprocess.Popen(
        f"cd /opt/ace && .venv/bin/acestep-api --host 0.0.0.0 --port {PORT}",
        shell=True,
    )
