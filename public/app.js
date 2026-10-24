// Tab switching
document.querySelectorAll(".tab").forEach((btn) => {
  btn.onclick = () => {
    document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
  };
});

const $ = (id) => document.getElementById(id);

async function callAPI(url, body) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Errore");
  return data;
}

// --- Idee ---
async function loadIdeas() {
  const out = $("ideasOut");
  out.innerHTML = "<div class='card'>⏳ Generando...</div>";
  try {
    const { idee } = await callAPI("/api/ideas", { argomento: $("ideaInput").value });
    out.innerHTML = idee
      .map(
        (i, n) => `
      <div class="card">
        <h3>#${n + 1} — ${i.titolo}</h3>
        <p><b>Hook:</b> ${i.hook}</p>
        <p style="color:#aaa;font-size:.9rem">${i.perche_funziona}</p>
      </div>`
      )
      .join("");
  } catch (e) {
    out.innerHTML = `<div class="card error">${e.message}</div>`;
  }
}

// --- Script ---
async function loadScript() {
  const out = $("scriptOut");
  out.innerHTML = "<div class='card'>⏳ Generando...</div>";
  try {
    const s = await callAPI("/api/script", { idea: $("scriptInput").value });
    out.innerHTML = `
      <div class="card"><h3>🎣 Hook</h3><p>${s.hook}</p></div>
      ${s.scena_per_scena
        .map(
          (x) => `<div class="card">
            <h3>⏱ ${x.secondi}s</h3>
            <p><b>Testo:</b> ${x.testo}</p>
            <p><b>Visual:</b> ${x.visual}</p>
          </div>`
        )
        .join("")}
      <div class="card"><h3>📣 CTA</h3><p>${s.cta_finale}</p></div>`;
  } catch (e) {
    out.innerHTML = `<div class="card error">${e.message}</div>`;
  }
}

// --- Caption ---
async function loadCaption() {
  const out = $("captionOut");
  out.innerHTML = "<div class='card'>⏳ Generando...</div>";
  try {
    const c = await callAPI("/api/caption", { argomento: $("captionInput").value });
    out.innerHTML = `
      <div class="card"><h3>✍️ Caption</h3><p>${c.caption}</p></div>
      <div class="card"><h3># Hashtag</h3>${c.hashtag.map((h) => `<span class="tag">${h}</span>`).join("")}</div>
      <div class="card"><h3>💬 Sottotitoli</h3>${c.sottotitoli.map((s) => `<p>${s}</p>`).join("")}</div>`;
  } catch (e) {
    out.innerHTML = `<div class="card error">${e.message}</div>`;
  }
}

// --- Analisi video ---
async function analyzeVideo() {
  const file = $("videoInput").files[0];
  const out = $("analyzeOut");
  if (!file) {
    out.innerHTML = `<div class="card error">Seleziona un video</div>`;
    return;
  }
  if (file.size > 50 * 1024 * 1024) {
    out.innerHTML = `<div class="card error">Video troppo grande (max 50 MB)</div>`;
    return;
  }
  out.innerHTML = "<div class='card'>⏳ Analisi in corso... (può richiedere 30-60s)</div>";

  try {
    const form = new FormData();
    form.append("video", file);
    const r = await fetch("/api/analyze", { method: "POST", body: form });
    const a = await r.json();
    if (!r.ok) throw new Error(a.error || "Errore");

    out.innerHTML = `
      <div class="card" style="text-align:center">
        <h3>Punteggio viralità</h3>
        <div class="score">${a.punteggio_viralita}/100</div>
      </div>
      <div class="card"><h3>✅ Punti di forza</h3><ul>${a.punti_di_forza.map((x) => `<li>${x}</li>`).join("")}</ul></div>
      <div class="card"><h3>❌ Punti deboli</h3><ul>${a.punti_deboli.map((x) => `<li>${x}</li>`).join("")}</ul></div>
      <div class="card"><h3>🎣 Analisi Hook</h3><p>${a.analisi_hook}</p></div>
      <div class="card"><h3>🚀 Nuovo hook suggerito</h3><p><b>${a.nuovo_hook_suggerito}</b></p></div>
      <div class="card"><h3>🎯 Suggerimenti concreti</h3><ul>${a.suggerimenti_concreti.map((x) => `<li>${x}</li>`).join("")}</ul></div>
      <div class="card"><h3>✍️ Caption</h3><p>${a.caption_suggerita}</p>
        ${a.hashtag_suggeriti.map((h) => `<span class="tag">${h}</span>`).join("")}</div>`;
  } catch (e) {
    out.innerHTML = `<div class="card error">${e.message}</div>`;
  }
}