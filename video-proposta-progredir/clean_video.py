"""Remove the burned-in captions from every frame (inpainting), keeping the calendar prop intact."""
import subprocess, sys, cv2, numpy as np
sys.path.insert(0, sys.argv[3]); from clean import caption_mask
SRC, OUT = sys.argv[1], sys.argv[2]
W, H, FPS = 720, 1280, 30
dec = subprocess.Popen(["ffmpeg", "-v", "error", "-i", SRC, "-f", "rawvideo", "-pix_fmt", "bgr24", "-"], stdout=subprocess.PIPE)
enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                        "-c:v", "libx264", "-crf", "12", "-preset", "medium", "-pix_fmt", "yuv420p", OUT], stdin=subprocess.PIPE)
n = 0
while True:
    b = dec.stdout.read(W * H * 3)
    if len(b) < W * H * 3: break
    t = n / FPS
    im = np.frombuffer(b, np.uint8).reshape(H, W, 3).copy()
    y1 = 1010
    if 23.9 <= t <= 28.4:                              # stop just above the calendar prop wherever it is held
        white = (im[760:1100].min(2) > 200).astype(np.uint8)
        nc, lab, st, _ = cv2.connectedComponentsWithStats(white, 8)
        tops = [st[i][1] for i in range(1, nc) if st[i][4] > 6000 and st[i][2] > 250]
        if tops: y1 = 760 + min(tops) - 6
    m = caption_mask(im, 620, y1)
    if m.any(): im = cv2.inpaint(im, m, 9, cv2.INPAINT_TELEA)
    enc.stdin.write(im.tobytes()); n += 1
enc.stdin.close(); enc.wait(); dec.wait(); print("frames", n)
