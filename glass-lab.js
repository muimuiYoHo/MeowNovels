/**
 * Liquid Glass Lab — 教学向简化复刻
 * 对齐 Pg_pidanai.com / assets/pdaim-home/liquid-glass.js 的核心折射思路
 * 背景为程序化绘制（不走 DOM 快照），方便单文件演示
 */
(() => {
  const bgCanvas = document.getElementById("bgCanvas");
  const glassCanvas = document.getElementById("glassCanvas");
  if (!bgCanvas || !glassCanvas) return;

  const bgCtx = bgCanvas.getContext("2d", { alpha: false });
  const outCtx = glassCanvas.getContext("2d", { alpha: true });

  const W = 900;
  const H = 520;

  // ---------- state ----------
  const state = {
    refract: 1,
    disp: 6.25,
    blur: 20,
    radius: 40,
    spec: 0.85,
    rim: 0.55,
    glassW: 220,
    glassH: 72,
    cx: W * 0.5,
    cy: H * 0.5,
    lightX: W * 0.25,
    lightY: H * 0.25,
    orbs: true,
    dither: true,
    onlyGlass: false,
    dragging: false,
    dragDX: 0,
    dragDY: 0,
    time: 0,
  };

  // ---------- background painting ----------
  function drawBackground(t) {
    const g = bgCtx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#0b1020");
    g.addColorStop(0.45, "#132038");
    g.addColorStop(1, "#0a1628");
    bgCtx.fillStyle = g;
    bgCtx.fillRect(0, 0, W, H);

    // grid dots
    bgCtx.fillStyle = "rgba(255,255,255,0.12)";
    const sp = 36;
    for (let y = 20; y < H; y += sp) {
      for (let x = 20; x < W; x += sp) {
        bgCtx.beginPath();
        bgCtx.arc(x, y, 1.1, 0, Math.PI * 2);
        bgCtx.fill();
      }
    }

    // color orbs (like refraction field)
    if (state.orbs) {
      const blobs = [
        { x: 0.18, y: 0.22, r: 0.32, c: "rgba(71,169,255,0.55)", dx: 0.04, dy: 0.03, sp: 0.6 },
        { x: 0.78, y: 0.18, r: 0.28, c: "rgba(255,108,174,0.48)", dx: -0.035, dy: 0.03, sp: 0.73 },
        { x: 0.72, y: 0.76, r: 0.34, c: "rgba(153,111,255,0.5)", dx: -0.03, dy: -0.03, sp: 0.51 },
        { x: 0.28, y: 0.78, r: 0.28, c: "rgba(83,221,184,0.42)", dx: 0.03, dy: -0.03, sp: 0.68 },
        { x: 0.5, y: 0.48, r: 0.38, c: "rgba(255,192,98,0.38)", dx: 0.025, dy: 0.02, sp: 0.44 },
      ];
      blobs.forEach((b) => {
        const x = W * (b.x + b.dx * Math.sin(t * b.sp));
        const y = H * (b.y + b.dy * Math.cos(t * b.sp * 0.9));
        const r = Math.min(W, H) * b.r;
        const rg = bgCtx.createRadialGradient(x, y, r * 0.05, x, y, r);
        rg.addColorStop(0, b.c);
        rg.addColorStop(1, "rgba(0,0,0,0)");
        bgCtx.fillStyle = rg;
        bgCtx.beginPath();
        bgCtx.arc(x, y, r, 0, Math.PI * 2);
        bgCtx.fill();
      });
    }

    // decorative shapes / "content" for refraction to bend
    const cards = [
      { x: 60, y: 80, w: 180, h: 100, r: 14, fill: "rgba(255,255,255,0.08)", stroke: "rgba(255,255,255,0.18)" },
      { x: 280, y: 140, w: 140, h: 140, r: 20, fill: "rgba(46,124,246,0.25)", stroke: "rgba(120,180,255,0.4)" },
      { x: 520, y: 70, w: 220, h: 80, r: 12, fill: "rgba(255,159,67,0.22)", stroke: "rgba(255,190,120,0.4)" },
      { x: 640, y: 280, w: 160, h: 120, r: 16, fill: "rgba(255,255,255,0.07)", stroke: "rgba(255,255,255,0.15)" },
      { x: 100, y: 300, w: 200, h: 90, r: 14, fill: "rgba(124,92,252,0.22)", stroke: "rgba(180,160,255,0.35)" },
    ];
    cards.forEach((c) => {
      roundRect(bgCtx, c.x, c.y, c.w, c.h, c.r);
      bgCtx.fillStyle = c.fill;
      bgCtx.fill();
      bgCtx.strokeStyle = c.stroke;
      bgCtx.lineWidth = 1.5;
      bgCtx.stroke();
    });

    // "text" content
    bgCtx.fillStyle = "rgba(255,255,255,0.88)";
    bgCtx.font = "700 42px 'Segoe UI', sans-serif";
    bgCtx.fillText("HELLO", 70, 230);
    bgCtx.fillStyle = "rgba(255,255,255,0.55)";
    bgCtx.font = "300 36px 'Segoe UI', sans-serif";
    bgCtx.fillText("LIQUID GLASS", 200, 230);

    bgCtx.fillStyle = "rgba(255,255,255,0.4)";
    bgCtx.font = "600 13px 'Segoe UI', sans-serif";
    bgCtx.fillText("STABILITY CORE · REFRACTION · DISPERSION", 70, 260);

    // fine lines that show bending clearly
    bgCtx.strokeStyle = "rgba(255,255,255,0.22)";
    bgCtx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const y = 380 + i * 14;
      bgCtx.beginPath();
      for (let x = 40; x < W - 40; x += 6) {
        const yy = y + Math.sin((x + t * 30 + i * 20) * 0.02) * 3;
        if (x === 40) bgCtx.moveTo(x, yy);
        else bgCtx.lineTo(x, yy);
      }
      bgCtx.stroke();
    }

    // light marker
    if (!state.onlyGlass) {
      bgCtx.beginPath();
      bgCtx.arc(state.lightX, state.lightY, 8, 0, Math.PI * 2);
      bgCtx.fillStyle = "rgba(255,255,255,0.85)";
      bgCtx.fill();
      bgCtx.beginPath();
      bgCtx.arc(state.lightX, state.lightY, 18, 0, Math.PI * 2);
      bgCtx.strokeStyle = "rgba(255,255,255,0.25)";
      bgCtx.stroke();
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w * 0.5, h * 0.5);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.closePath();
  }

  // ---------- glass sampling (2D approximation of the shader) ----------
  // For each pixel of the glass, compute SDF of rounded box relative to glass center,
  // derive edge factor and sample background with normal-based displacement + RGB dispersion.
  function drawGlass(skipClear) {
    if (!skipClear) outCtx.clearRect(0, 0, W, H);

    const hw = state.glassW * 0.5;
    const hh = state.glassH * 0.5;
    const radius = Math.min(state.radius, hw, hh);
    const glassRadius = Math.max(radius, 1);
    const blurR = state.blur;
    const x0 = Math.floor(state.cx - hw - 8);
    const y0 = Math.floor(state.cy - hh - 8);
    const x1 = Math.ceil(state.cx + hw + 8);
    const y1 = Math.ceil(state.cy + hh + 8);

    // outer rim shadow (behind glass)
    if (state.rim > 0.01) {
      outCtx.save();
      const rim = 6.25;
      outCtx.shadowColor = `rgba(0,0,0,${0.55 * state.rim})`;
      outCtx.shadowBlur = rim * 3;
      outCtx.shadowOffsetX = 4;
      outCtx.shadowOffsetY = 6;
      roundRect(outCtx, state.cx - hw, state.cy - hh, state.glassW, state.glassH, radius);
      outCtx.fillStyle = "rgba(0,0,0,0.01)";
      outCtx.fill();
      outCtx.restore();
    }

    // 只读玻璃邻域（位移最大约 glassRadius），避免每帧 getImageData 整屏
    const pad = Math.ceil(glassRadius + 6.25 + Math.abs(state.disp) + 4);
    const sx0 = Math.max(0, x0 - pad);
    const sy0 = Math.max(0, y0 - pad);
    const sx1 = Math.min(W, x1 + pad);
    const sy1 = Math.min(H, y1 + pad);
    const src = bgCtx.getImageData(sx0, sy0, sx1 - sx0, sy1 - sy0);
    const sd = src.data;
    const sw = src.width;

    const img = outCtx.createImageData(Math.max(1, x1 - x0), Math.max(1, y1 - y0));
    const od = img.data;
    const iw = img.width;

    // dither matrix (8x8 Bayer-ish from original)
    const D8 = [
      0, 0.5, 0.125, 0.625, 0.03125, 0.53125, 0.15625, 0.65625,
      0.75, 0.25, 0.875, 0.375, 0.78125, 0.28125, 0.90625, 0.40625,
      0.1875, 0.6875, 0.0625, 0.5625, 0.21875, 0.71875, 0.09375, 0.59375,
      0.9375, 0.4375, 0.8125, 0.3125, 0.96875, 0.46875, 0.84375, 0.34375,
      0.046875, 0.546875, 0.171875, 0.671875, 0.015625, 0.515625, 0.140625, 0.640625,
      0.796875, 0.296875, 0.921875, 0.421875, 0.765625, 0.265625, 0.890625, 0.390625,
      0.234375, 0.734375, 0.109375, 0.609375, 0.203125, 0.703125, 0.078125, 0.578125,
      0.984375, 0.484375, 0.859375, 0.359375, 0.953125, 0.453125, 0.828125, 0.328125,
    ];

    function sdRoundBox(px, py) {
      const qx = Math.abs(px) - hw + radius;
      const qy = Math.abs(py) - hh + radius;
      const mx = Math.max(qx, 0);
      const my = Math.max(qy, 0);
      return Math.hypot(mx, my) + Math.min(Math.max(qx, qy), 0) - radius;
    }

    function liquidRel(dst, gr, br) {
      const t = Math.min(Math.max((dst - gr + br) / br, 0), 1);
      const n = Math.pow(t, 1.75);
      return 1 - Math.pow(1 - Math.pow(1 - n, 1.25), 2.0);
    }

    function sample(px, py) {
      let sx = (px | 0) - sx0;
      let sy = (py | 0) - sy0;
      if (sx < 0) sx = 0;
      if (sy < 0) sy = 0;
      if (sx >= sw) sx = sw - 1;
      if (sy >= src.height) sy = src.height - 1;
      const i = (sy * sw + sx) * 4;
      return [sd[i], sd[i + 1], sd[i + 2], 255];
    }

    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const px = x - state.cx;
        const py = y - state.cy;
        const sdist = sdRoundBox(px, py);
        // smooth visibility mask (approx smoothstep 0.25..1.0)
        const maskT = Math.min(Math.max((sdist - 0.25) / 0.75, 0), 1);
        const visible = 1 - maskT * maskT * (3 - 2 * maskT);
        const oi = ((y - y0) * iw + (x - x0)) * 4;
        if (visible <= 0.002) {
          od[oi + 3] = 0;
          continue;
        }

        // normal via central difference on SDF
        let nx = sdRoundBox(px + 1, py) - sdRoundBox(px - 1, py);
        let ny = sdRoundBox(px, py + 1) - sdRoundBox(px, py - 1);
        let nl = Math.hypot(nx, ny);
        if (nl < 1e-4) {
          nx = px;
          ny = 0;
          nl = Math.hypot(nx, ny) || 1;
        }
        nx /= nl;
        ny /= nl;

        const dist = Math.min(Math.max(glassRadius + sdist, 0), glassRadius + 6.25);
        const dx = nx * dist;
        const dy = ny * dist;

        const rel = liquidRel(dist, glassRadius, blurR);
        const ref = rel;
        const dsp = Math.min(1, state.disp / glassRadius * (1 - ref));

        // light falloff (simplified dt)
        const lvx = x - state.lightX;
        const lvy = y - state.lightY;
        const dt = Math.min(Math.max((Math.abs(lvx) + Math.abs(lvy)) / Math.max(blurR * 6, 40), 0), 1);

        // chromatic three-tap sample
        const k = state.refract;
        const rC = sample(x - dx * (1 - ref + dsp) * k, y - dy * (1 - ref + dsp) * k);
        const gC = sample(x - dx * (1 - ref) * k, y - dy * (1 - ref) * k);
        const bC = sample(x - dx * (1 - ref - dsp) * k, y - dy * (1 - ref - dsp) * k);

        let r = rC[0];
        let g = gC[1];
        let b = bC[2];

        // inner edge shading
        if (rel < 0.15) {
          const shad = 0.85 + rel;
          r *= shad;
          g *= shad;
          b *= shad;
        }

        // specular highlights (simplified from num1 / num2)
        if (state.spec > 0.01) {
          const num1 = Math.min(Math.max(dist - glassRadius + 2.25, 0), 1) * dt;
          const num2 = (1 - rel * (1 - rel) * (1 - rel)) *
            Math.pow(Math.max(0, 1 - (glassRadius - dist) / blurR), 2.2) * dt;
          const ldx = state.lightX - x;
          const ldy = state.lightY - y;
          const angle = Math.atan2(dy, dx) - Math.atan2(ldy, ldx);
          const ang1 = Math.cos(angle);
          const ang2 = Math.cos(angle - Math.PI);

          if (num1 > 0) {
            const high = num1 * Math.max(0.16, ang1) * state.spec;
            r = r * (1 - high) + (255 - r) * high;
            g = g * (1 - high) + (255 - g) * high;
            b = b * (1 - high) + (255 - b) * high;
          }
          if (num2 > 0) {
            const high = num2 * Math.pow(Math.max(0, Math.max(ang2 * 0.4, ang1 * 0.3)), 2.2) * state.spec;
            r = r + (255 - r) * high;
            g = g + (255 - g) * high;
            b = b + (255 - b) * high;
          }
        }

        // outer rim shade near boundary
        if (state.rim > 0.01 && dist > glassRadius - 2 && sdist <= 0.75) {
          let shad = Math.min(Math.max((dist - glassRadius) / 6.25, 0), 1);
          const glassAngle = Math.atan2(dy, dx);
          const lightAngle = Math.atan2(y - state.lightY, x - state.lightX);
          const ang = glassAngle - lightAngle;
          shad = 1 - (1 - shad) * Math.max(0.16, Math.cos(ang)) * dt;
          shad = Math.pow(shad, 1 / 2.2) * 0.5 + 0.5;
          const mul = 1 - (1 - shad) * state.rim;
          r *= mul;
          g *= mul;
          b *= mul;
        }

        // dither + 8-bit quantize (original: floor(color*255+dither)/255)
        const dv = state.dither
          ? D8[(x & 7) + (y & 7) * 8]
          : 0;
        r = Math.floor(Math.min(Math.max(r, 0), 255) + dv) ;
        g = Math.floor(Math.min(Math.max(g, 0), 255) + dv);
        b = Math.floor(Math.min(Math.max(b, 0), 255) + dv);
        // original quantizes 0..1 space; keep 0..255 here

        od[oi] = r;
        od[oi + 1] = g;
        od[oi + 2] = b;
        od[oi + 3] = Math.round(255 * visible);
      }
    }

    outCtx.putImageData(img, x0, y0);
  }

  // ---------- interaction ----------
  function hitGlass(mx, my) {
    const hw = state.glassW * 0.5;
    const hh = state.glassH * 0.5;
    return (
      mx >= state.cx - hw - 6 &&
      mx <= state.cx + hw + 6 &&
      my >= state.cy - hh - 6 &&
      my <= state.cy + hh + 6
    );
  }

  function canvasPos(e) {
    const rect = glassCanvas.getBoundingClientRect();
    const sx = (e.clientX ?? e.touches?.[0]?.clientX ?? 0) - rect.left;
    const sy = (e.clientY ?? e.touches?.[0]?.clientY ?? 0) - rect.top;
    return {
      x: (sx / rect.width) * W,
      y: (sy / rect.height) * H,
    };
  }

  glassCanvas.addEventListener("pointerdown", (e) => {
    const p = canvasPos(e);
    if (hitGlass(p.x, p.y)) {
      state.dragging = true;
      state.dragDX = p.x - state.cx;
      state.dragDY = p.y - state.cy;
      glassCanvas.setPointerCapture(e.pointerId);
    } else {
      state.lightX = p.x;
      state.lightY = p.y;
      updateReadout();
    }
  });
  glassCanvas.addEventListener("pointermove", (e) => {
    if (!state.dragging) return;
    const p = canvasPos(e);
    const hw = state.glassW * 0.5;
    const hh = state.glassH * 0.5;
    state.cx = Math.min(Math.max(p.x - state.dragDX, hw), W - hw);
    state.cy = Math.min(Math.max(p.y - state.dragDY, hh), H - hh);
    updateReadout();
  });
  glassCanvas.addEventListener("pointerup", () => {
    state.dragging = false;
  });
  glassCanvas.addEventListener("pointercancel", () => {
    state.dragging = false;
  });
  // click empty stage = move light (also on bg)
  bgCanvas.style.pointerEvents = "none";

  // controls
  function bindRange(id, key, labelId, fmt) {
    const el = document.getElementById(id);
    const lab = document.getElementById(labelId);
    if (!el) return;
    el.addEventListener("input", () => {
      state[key] = parseFloat(el.value);
      if (lab) lab.textContent = fmt(state[key]);
    });
  }
  bindRange("pRefract", "refract", "vRefract", (v) => v.toFixed(2));
  bindRange("pDisp", "disp", "vDisp", (v) => v.toFixed(1));
  bindRange("pBlur", "blur", "vBlur", (v) => String(Math.round(v)));
  bindRange("pRadius", "radius", "vRadius", (v) => String(Math.round(v)));
  bindRange("pSpec", "spec", "vSpec", (v) => v.toFixed(2));
  bindRange("pRim", "rim", "vRim", (v) => v.toFixed(2));
  bindRange("pW", "glassW", "vW", (v) => String(Math.round(v)));
  bindRange("pH", "glassH", "vH", (v) => String(Math.round(v)));

  function bindToggle(id, key) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("click", () => {
      state[key] = !state[key];
      el.classList.toggle("on", state[key]);
    });
  }
  // onlyGlass is inverted visual toggle — treat as exclusive-ish
  const tOrbs = document.getElementById("tOrbs");
  const tDither = document.getElementById("tDither");
  const tOnly = document.getElementById("tOnlyGlass");
  const tReset = document.getElementById("tReset");
  tOrbs?.addEventListener("click", () => {
    state.orbs = !state.orbs;
    tOrbs.classList.toggle("on", state.orbs);
  });
  tDither?.addEventListener("click", () => {
    state.dither = !state.dither;
    tDither.classList.toggle("on", state.dither);
  });
  tOnly?.addEventListener("click", () => {
    state.onlyGlass = !state.onlyGlass;
    tOnly.classList.toggle("on", state.onlyGlass);
  });
  tReset?.addEventListener("click", () => {
    Object.assign(state, {
      refract: 1, disp: 6.25, blur: 20, radius: 40, spec: 0.85, rim: 0.55,
      glassW: 220, glassH: 72, cx: W * 0.5, cy: H * 0.5,
      lightX: W * 0.25, lightY: H * 0.25, orbs: true, dither: true, onlyGlass: false,
    });
    syncUI();
    updateReadout();
  });

  function syncUI() {
    const map = [
      ["pRefract", "vRefract", state.refract, 2],
      ["pDisp", "vDisp", state.disp, 1],
      ["pBlur", "vBlur", state.blur, 0],
      ["pRadius", "vRadius", state.radius, 0],
      ["pSpec", "vSpec", state.spec, 2],
      ["pRim", "vRim", state.rim, 2],
      ["pW", "vW", state.glassW, 0],
      ["pH", "vH", state.glassH, 0],
    ];
    map.forEach(([pid, vid, val, digits]) => {
      const p = document.getElementById(pid);
      const v = document.getElementById(vid);
      if (p) p.value = String(val);
      if (v) v.textContent = digits ? val.toFixed(digits) : String(Math.round(val));
    });
    tOrbs?.classList.toggle("on", state.orbs);
    tDither?.classList.toggle("on", state.dither);
    tOnly?.classList.toggle("on", state.onlyGlass);
  }

  function updateReadout() {
    const lx = document.getElementById("vLight");
    const lp = document.getElementById("vPos");
    if (lx) {
      lx.textContent =
        `${Math.round((state.lightX / W) * 100)}% · ${Math.round((state.lightY / H) * 100)}%`;
    }
    if (lp) {
      lp.textContent = `${Math.round(state.cx)} , ${Math.round(state.cy)}`;
    }
  }

  // ---------- loop ----------
  let last = 0;
  function frame(now) {
    state.time = now * 0.001;
    if (now - last > 28) {
      last = now;
      drawBackground(state.time);
      if (state.onlyGlass) {
        outCtx.clearRect(0, 0, W, H);
        outCtx.fillStyle = "rgba(0,0,0,0.55)";
        outCtx.fillRect(0, 0, W, H);
        drawGlass(true);
      } else {
        drawGlass();
      }
    }
    requestAnimationFrame(frame);
  }

  syncUI();
  updateReadout();
  requestAnimationFrame(frame);
})();
