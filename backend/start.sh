#!/usr/bin/env bash
# =============================================================================
# MindfulMomentum Backend — Setup & Start Script
# =============================================================================
# Usage:
#   First time : bash start.sh --setup
#   Normal run : bash start.sh
# =============================================================================

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV="$SCRIPT_DIR/.venv"

setup() {
    echo ""
    echo "======================================================"
    echo "  MindfulMomentum Backend — One-Time Setup"
    echo "======================================================"

    # Create venv if missing
    if [ ! -d "$VENV" ]; then
        echo "[1/4] Creating Python virtual environment..."
        python3 -m venv "$VENV"
    else
        echo "[1/4] Virtual environment already exists — skipping."
    fi

    echo "[2/4] Installing PyTorch with CUDA 12.8 support..."
    "$VENV/bin/pip" install --quiet torch torchvision \
        --index-url https://download.pytorch.org/whl/cu128

    echo "[3/4] Installing all other dependencies..."
    "$VENV/bin/pip" install --quiet \
        typing_extensions \
        fastapi "uvicorn[standard]" "pydantic>=2.0" \
        pandas numpy scikit-learn imbalanced-learn \
        xgboost lightgbm joblib \
        transformers "sentence-transformers>=3.0" nltk "accelerate>=0.30" \
        matplotlib seaborn

    echo "[4/4] Verifying GPU..."
    "$VENV/bin/python" -c "
import torch
print('PyTorch:', torch.__version__)
print('CUDA available:', torch.cuda.is_available())
if torch.cuda.is_available():
    print('GPU:', torch.cuda.get_device_name(0))
    print('VRAM:', round(torch.cuda.get_device_properties(0).total_memory / 1024**2), 'MB')
"
    echo ""
    echo "======================================================"
    echo "  Setup complete! Run 'bash start.sh' to start."
    echo "======================================================"
}

start() {
    echo ""
    echo "======================================================"
    echo "  MindfulMomentum Backend v2 — Starting"
    echo "======================================================"

    if [ ! -d "$VENV" ]; then
        echo "[ERROR] Virtual environment not found."
        echo "        Run:  bash start.sh --setup"
        exit 1
    fi

    # Print local IP so you can configure the mobile app
    LOCAL_IP=$(hostname -I | awk '{print $1}')
    echo "  Server URL  : http://$LOCAL_IP:8000"
    echo "  API Docs    : http://$LOCAL_IP:8000/docs"
    echo "  Health Check: http://$LOCAL_IP:8000/api/health"
    echo ""
    echo "  [!] Update mobile-app/lib/api.ts with:"
    echo "      const API_BASE_URL = 'http://$LOCAL_IP:8000';"
    echo "======================================================"
    echo ""

    cd "$SCRIPT_DIR"
    "$VENV/bin/python" -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload
}

# ── Entry point ────────────────────────────────────────────────────────────────
if [ "$1" = "--setup" ]; then
    setup
else
    start
fi
