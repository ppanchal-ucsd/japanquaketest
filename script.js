/* =========================
   JAPAN LIVE HEATMAP (USGS API, last 30 days)
========================= */
(async function japanHeatmapLive30d() {
  // --- Config ---
  const API = "https://earthquake.usgs.gov/fdsnws/event/1/query";
  const today = new Date();
  const start = new Date(today.getTime() - 30*24*60*60*1000); // 30 days ago
  const START = start.toISOString().slice(0, 10);             // YYYY-MM-DD
  const END   = today.toISOString().slice(0, 10);
  const MIN_MAG = 3.0;

  const JAPAN = { lat: 36.2, lon: 138.25, zoom: 5 };
  const FRAME_MS = 700;
  const HEAT_RADIUS = 18;

  const labelEl = document.getElementById("jp-frame-label");
  const playBtn = document.getElementById("jp-play");
  const pauseBtn = document.getElementById("jp-pause");
  const sectionEl = document.getElementById("jp-heatmap-section");

  // --- Map ---
  const map = L.map("jp-heatmap", { zoomControl: true, scrollWheelZoom: true })
    .setView([JAPAN.lat, JAPAN.lon], JAPAN.zoom);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap"
  }).addTo(map);

  // --- Fetch last 30 days in Japan bbox ---
  const url =
    `${API}?format=geojson&starttime=${START}&endtime=${END}` +
    `&minmagnitude=${MIN_MAG}&minlatitude=24&maxlatitude=46&minlongitude=122&maxlongitude=154` +
    `&orderby=time-asc`;
  labelEl.textContent = "Loading live data (last 30 days)…";
  const data = await fetch(url).then(r => r.json());
  const features = data.features || [];

  if (!features.length) {
    labelEl.textContent = "No earthquake data found.";
    return;
  }

  // --- Parse rows ---
  const rows = features.map(f => {
    const p = f.properties, g = f.geometry.coordinates;
    return { t: new Date(p.time), lat: g[1], lon: g[0], mag: p.mag };
  }).filter(d => !isNaN(d.lat) && !isNaN(d.lon) && d.mag != null);

  // --- Auto granularity & grouping ---
  const spanDays = (d3.max(rows, d => d.t) - d3.min(rows, d => d.t)) / 86400000;
  let gran = "daily", fmt = d3.timeFormat("%Y-%m-%d");
  if (spanDays > 31 && spanDays <= 180) { gran = "weekly"; fmt = d3.timeFormat("Week of %Y-%m-%d"); }
  else if (spanDays > 180) { gran = "monthly"; fmt = d3.timeFormat("%Y-%m"); }

  const keyFn = d => {
    if (gran === "daily")  return d3.timeDay.floor(d.t).toISOString();
    if (gran === "weekly") return d3.timeMonday.floor(d.t).toISOString();
    return d3.timeMonth.floor(d.t).toISOString();
  };

  const groups = d3.group(rows, keyFn);
  const keys = Array.from(groups.keys()).sort((a,b) => new Date(a) - new Date(b));
  const frames = keys.map(k =>
    groups.get(k).map(d => [d.lat, d.lon, Math.pow(d.mag/9, 1.5) * 0.8 + 0.2])
  );
  const labels = keys.map(k => fmt(new Date(k)));

  // --- Heat layer ---
  const heat = L.heatLayer(frames[0] || [], {
    radius: HEAT_RADIUS, blur: HEAT_RADIUS, maxZoom: 7, minOpacity: 0.2
  }).addTo(map);

  // --- Animation controls ---
  let i = 0, timer = null;
  function renderFrame(idx){
    if (!frames.length) return;
    heat.setLatLngs(frames[idx]);
    labelEl.textContent = labels[idx] || "";
  }
  function play(){
    if (timer || !frames.length) return;
    renderFrame(i);
    timer = setInterval(() => {
      i = (i + 1) % frames.length;
      renderFrame(i);
    }, FRAME_MS);
  }
  function pause(){
    if (timer) { clearInterval(timer); timer = null; }
  }
  playBtn.addEventListener("click", play);
  pauseBtn.addEventListener("click", pause);

  // --- Scroll trigger ---
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => (e.isIntersecting && e.intersectionRatio >= 0.5) ? play() : pause());
  }, { threshold: [0, 0.5, 1] });
  io.observe(sectionEl);

  renderFrame(0);
  labelEl.textContent = "Ready — scroll here to play live data";
})();
