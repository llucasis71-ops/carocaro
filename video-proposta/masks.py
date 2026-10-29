import subprocess, sys, numpy as np
import mediapipe as mp
SRC, OUT = sys.argv[1], sys.argv[2]
W, H = 720, 1280
dec = subprocess.Popen(["ffmpeg", "-v", "error", "-i", SRC, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
seg = mp.solutions.selfie_segmentation.SelfieSegmentation(model_selection=0)
masks, prev = [], None
while True:
    b = dec.stdout.read(W * H * 3)
    if len(b) < W * H * 3: break
    fr = np.frombuffer(b, np.uint8).reshape(H, W, 3)
    m = seg.process(fr).segmentation_mask.astype(np.float32)
    prev = m if prev is None else 0.6 * m + 0.4 * prev    # light temporal smoothing against flicker
    masks.append((prev[::2, ::2] * 255).astype(np.uint8))
np.save(OUT, np.stack(masks))
print(len(masks))
