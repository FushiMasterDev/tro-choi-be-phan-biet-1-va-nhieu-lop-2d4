"""Generate audio/ting.wav (correct) and audio/buzz.wav (wrong). Offline, stdlib only:  python3 gen_sfx.py"""
import math, os, struct, wave

RATE = 22050
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "audio")

def save(name, samples):
    peak = max(abs(x) for x in samples)
    assert 0 < peak, f"{name} is silent"
    with wave.open(os.path.join(OUT, name), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE)
        w.writeframes(b"".join(struct.pack("<h", int(x / peak * 0.9 * 32767)) for x in samples))
    print(name, f"{len(samples) / RATE:.2f}s")

def ting():
    # bright bell: E6 then B6 a moment later, each decaying
    out = []
    for i in range(int(RATE * 0.9)):
        t = i / RATE
        x = math.sin(2 * math.pi * 1318.5 * t) * math.exp(-5 * t)
        if t > 0.09:
            u = t - 0.09
            x += 0.8 * math.sin(2 * math.pi * 1975.5 * u) * math.exp(-4.5 * u) + 0.2 * math.sin(2 * math.pi * 3951 * u) * math.exp(-9 * u)
        out.append(x * min(1, t / 0.003))
    return out

def buzz():
    # "rè rè": two harsh pulses, mid-low pitch so laptop/phone speakers can reproduce it
    out = []
    for pulse in range(2):
        n = int(RATE * 0.24)
        for i in range(n):
            t = i / RATE
            sq = 1 if math.sin(2 * math.pi * 185 * t) >= 0 else -1
            saw = 2 * ((t * 192) % 1) - 1
            env = min(1, t / 0.005, (n - i) / RATE / 0.02)
            out.append((0.6 * sq + 0.4 * saw) * env)
        if pulse == 0:
            out += [0.0] * int(RATE * 0.07)
    return out

os.makedirs(OUT, exist_ok=True)
save("ting.wav", ting())
save("buzz.wav", buzz())
