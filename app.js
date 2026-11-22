// INVENTORY: data/entries.json 을 읽어 와인 리스트(carte)처럼 보여 준다. 기록은 내 컴퓨터의 관리 화면(admin)에서 더한다.
// 줄(제목 ······ 날짜)을 누르면 사진·설명이 펼쳐진다. 위에는 기록한 곳 지도.
const CATS = ["전체", "행사", "와이너리", "와인", "공간", "사람"];
const RUBRIC = {"행사": "ÉVÉNEMENTS", "와이너리": "DOMAINES", "와인": "VINS", "공간": "LIEUX", "사람": "RENCONTRES"};
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
let ENTRIES = [], CAT = "전체";

function no(i){ return "INV-" + String(i).padStart(3, "0"); }
function fmtDate(d){ return (d || "").replace(/-/g, "."); }
const photosOf = e => e.photos?.length ? e.photos : (e.photo ? [e.photo] : []);

// 사진: 첫 장이 대표, 여러 장이면 아래 작은 사진을 눌러 바꿔 본다
function photoBlock(e){
  const ps = photosOf(e);
  if (!ps.length) return "";
  const alt = esc(e.photo_alt || e.title);
  return `<figure class="gallery"><img class="main" src="${esc(ps[0])}" alt="${alt}" loading="lazy">` +
    (ps.length > 1 ? `<div class="thumbs">${ps.map((p, i) =>
      `<button type="button" data-src="${esc(p)}" aria-label="사진 ${i + 1} / ${ps.length}" aria-pressed="${i === 0}"><img src="${esc(p)}" alt="" loading="lazy"></button>`).join("")}</div>` : "") +
    `</figure>`;
}

function row(e){
  const n = photosOf(e).length;
  return `
    <details class="entry" id="inv-${e.no}">
      <summary>
        <span class="no">${no(e.no)}</span>
        <span class="line"><span class="name">${esc(e.title)}</span><span class="dots" aria-hidden="true"></span><span class="val">${fmtDate(e.date)}</span></span>
        <span class="sub">${esc(e.place || "")}${n ? ` · 사진 ${n}` : ""}</span>
      </summary>
      <div class="detail">
        ${photoBlock(e)}
        ${e.note ? `<p class="note">${esc(e.note)}</p>` : ""}
        ${/^https?:\/\//.test(e.link || "") ? `<p class="link"><a href="${esc(e.link)}" target="_blank" rel="noopener">${/instagram\.com\/reel/.test(e.link) ? "인스타그램 릴스 보기" : /instagram\.com/.test(e.link) ? "인스타그램 게시물 보기" : "관련 링크"} ↗</a></p>` : ""}
        ${e.keep ? `<p class="keep"><b>남은 기준</b> ${esc(e.keep)}</p>` : ""}
      </div>
    </details>`;
}

function draw(){
  document.getElementById("filters").innerHTML = CATS.map(c => {
    const n = c === "전체" ? ENTRIES.length : ENTRIES.filter(e => e.category === c).length;
    return `<button type="button" role="tab" aria-selected="${c === CAT}" data-c="${c}">${c} ${n}</button>`;
  }).join("");
  const list = ENTRIES.filter(e => CAT === "전체" || e.category === CAT);
  const groups = CATS.slice(1).map(c => [c, list.filter(e => e.category === c)]).filter(([, l]) => l.length);
  document.getElementById("cards").innerHTML = list.length
    ? `<div class="carte">${groups.map(([c, l]) => `<div class="rubric"><span>${RUBRIC[c] || c}</span><small>${esc(c)}</small></div>${l.map(row).join("")}`).join("")}</div>`
    : `<div class="empty">${ENTRIES.length ? "이 종류의 기록은 아직 없어요." : "첫 기록을 정리하고 있어요. 곧 한 장씩 채워질 거예요."}</div>`;
  drawMap(list);
}

// 지도: 세계지도 그림(vendor/world.svg, Natural Earth) 위에 다녀온 곳을 점으로. 점을 누르면 그 줄이 펼쳐진다
// 그림 범위: 경도 -180~180, 위도 84~-60 (남극 제외)
function drawMap(list){
  const box = document.getElementById("invmap");
  const has = e => e.lat !== "" && e.lat != null && e.lng !== "" && e.lng != null;
  if (!ENTRIES.some(has)) { box.hidden = true; return; }
  box.hidden = false;
  // 같은 곳(장소 첫 단어가 같거나 0.3도 안쪽)은 점 하나로 묶고 'Hong Kong · 2'처럼 보여 준다
  const placeName = e => (e.place || "").split(",")[0].trim() || e.title;
  const key = n => n.toLowerCase().replace(/\s+/g, "");
  const groups = [];
  list.filter(has).forEach(e => {
    const g = groups.find(g => g.key === key(placeName(e))) || groups.find(g => Math.abs(g.lat - e.lat) < .3 && Math.abs(g.lng - e.lng) < .3);
    if (g) g.items.push(e); else groups.push({key: key(placeName(e)), name: placeName(e), lat: +e.lat, lng: +e.lng, items: [e]});
  });
  // 가까운 무리끼리는 이름표를 위·아래로 나눠 겹치지 않게
  groups.forEach((g, i) => { g.below = groups.slice(0, i).some(h => !h.below && Math.abs(h.lat - g.lat) < 6 && Math.abs(h.lng - g.lng) < 12); });
  box.innerHTML = `<div class="world"><img src="vendor/world.svg?v=2" alt="" aria-hidden="true">${groups.map((g, gi) => {
      const x = (g.lng + 180) / 360 * 100, y = (84 - g.lat) / 144 * 100, n = g.items.length;
      const one = n === 1;
      return `<div class="pin${g.below ? " below" : ""}" style="left:${x.toFixed(2)}%;top:${y.toFixed(2)}%">
        <button type="button" class="pt" ${one ? `data-open="${g.items[0].no}"` : `data-group="${gi}" aria-expanded="false"`}
          aria-label="${esc(g.name)}${one ? ` · ${esc(g.items[0].title)} 펼치기` : ` 기록 ${n}개 보기`}"><span class="tip">${esc(g.name)}${one ? "" : ` · ${n}`}<small>${one ? esc(g.items[0].title) : "눌러서 고르기"}</small></span></button>
        ${one ? "" : `<ul class="pop" hidden>${g.items.map(e => `<li><button type="button" data-open="${e.no}">${esc(e.title)}<small>${fmtDate(e.date)}</small></button></li>`).join("")}</ul>`}
      </div>`;
    }).join("")}</div><p class="worldcap">다녀온 곳 ${groups.length}곳 · 기록 ${list.filter(has).length}개 · 점을 누르면 그 기록이 펼쳐져요</p>`;
}

function openEntry(n){
  const d = document.getElementById("inv-" + n); if (!d) return;
  d.open = true; d.scrollIntoView({behavior: "smooth", block: "start"});
}
document.getElementById("invmap").addEventListener("click", e => {
  const g = e.target.closest("[data-group]");
  if (g) {   // 여러 기록이 모인 점: 목록 열고 닫기
    const pop = g.parentNode.querySelector(".pop"), open = pop.hidden;
    document.querySelectorAll("#invmap .pop").forEach(p => { p.hidden = true; p.parentNode.querySelector("[data-group]")?.setAttribute("aria-expanded", "false"); });
    pop.hidden = !open; g.setAttribute("aria-expanded", String(open)); return;
  }
  const a = e.target.closest("[data-open]"); if (!a) return;
  e.preventDefault(); document.querySelectorAll("#invmap .pop").forEach(p => p.hidden = true); openEntry(a.dataset.open);
});
document.getElementById("cards").addEventListener("click", e => {
  const t = e.target.closest(".thumbs button"); if (!t) return;
  const g = t.closest(".gallery");
  g.querySelector("img.main").src = t.dataset.src;
  g.querySelectorAll(".thumbs button").forEach(x => x.setAttribute("aria-pressed", x === t));
});
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
    if (location.hash.startsWith("#inv-")) openEntry(location.hash.slice(5));
  });
draw();
