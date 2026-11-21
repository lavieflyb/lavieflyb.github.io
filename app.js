// INVENTORY: data/entries.json 을 읽어 카드로 보여 준다. 기록은 내 컴퓨터의 관리 화면(admin)에서 더한다.
const CATS = ["전체", "행사", "와이너리", "공간", "사람"];
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
let ENTRIES = [], CAT = "전체";

function no(i){ return "INV-" + String(i).padStart(3, "0"); }
function fmtDate(d){ return (d || "").replace(/-/g, "."); }

function draw(){
  document.getElementById("filters").innerHTML = CATS.map(c => {
    const n = c === "전체" ? ENTRIES.length : ENTRIES.filter(e => e.category === c).length;
    return `<button type="button" role="tab" aria-selected="${c === CAT}" data-c="${c}">${c} ${n}</button>`;
  }).join("");
  const list = ENTRIES.filter(e => CAT === "전체" || e.category === CAT);
  document.getElementById("cards").innerHTML = list.length ? list.map(e => `
    <article class="card">
      ${e.photo ? `<img src="${esc(e.photo)}" alt="${esc(e.photo_alt || e.title)}" loading="lazy">` : ""}
      <div class="body">
        <div class="meta"><span class="cat">${esc(e.category)}</span><span>${no(e.no)} · ${fmtDate(e.date)}</span></div>
        <h3>${esc(e.title)}</h3>
        ${e.place ? `<div class="place">${esc(e.place)}</div>` : ""}
        ${e.note ? `<p>${esc(e.note)}</p>` : ""}
        ${e.keep ? `<div class="keep"><b>남은 기준</b> ${esc(e.keep)}</div>` : ""}
      </div>
    </article>`).join("")
    : `<div class="empty">${ENTRIES.length ? "이 종류의 기록은 아직 없어요." : "첫 기록을 정리하고 있어요. 곧 한 장씩 채워질 거예요."}</div>`;
}

document.getElementById("filters").addEventListener("click", e => {
  const b = e.target.closest("button[data-c]"); if (!b) return;
  CAT = b.dataset.c; draw();
});

fetch("data/entries.json", {cache: "no-store"})
  .then(r => r.ok ? r.json() : [])
  .catch(() => [])
  .then(list => {
    ENTRIES = (Array.isArray(list) ? list : []).filter(e => e.public)
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    const last = ENTRIES.map(e => e.updated || e.date).sort().pop();
    if (last) document.getElementById("updated").textContent = "마지막 기록 " + fmtDate(last.slice(0, 10));
    draw();
  });
draw();
