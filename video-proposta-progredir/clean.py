import cv2, numpy as np, sys
def caption_mask(im, y0=620, y1=1010):
    h, w = im.shape[:2]
    mn = im.min(2)
    m = np.zeros((h, w), np.uint8)
    m[y0:y1] = (mn[y0:y1] > 212).astype(np.uint8) * 255
    n, lab, st, _ = cv2.connectedComponentsWithStats(m, 8)
    keep = np.zeros_like(m)
    for i in range(1, n):
        x, y, ww, hh, a = st[i]
        if hh <= 48 and ww <= 90 and a <= 1600:      # glyph-sized blobs only (not the paper sign)
            keep[lab == i] = 255
    # glyphs sit on a line: drop isolated specks with no neighbours nearby
    near = cv2.dilate(keep, np.ones((9, 41), np.uint8))
    n2, lab2, st2, _ = cv2.connectedComponentsWithStats(near, 8)
    for i in range(1, n2):
        if st2[i][2] < 26: keep[lab2 == i] = 0
    # grow over the glyphs' dark outline/shadow, then blend the patch in
    return cv2.dilate(keep, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11)), iterations=1)
if __name__ == "__main__":
    for p in sys.argv[1:]:
        im = cv2.imread(p); m = caption_mask(im)
        out = cv2.inpaint(im, m, 9, cv2.INPAINT_TELEA)
        both = np.hstack([im, out])[560:1060]
        cv2.imwrite(p.replace(".png", "_clean.jpg"), cv2.resize(both, (720, 250)))
