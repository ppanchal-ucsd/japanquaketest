/* =========================
   PAGE NAV DOTS
========================= */
const dots = document.querySelectorAll(".nav-dot");
const sections = [document.querySelector(".hero"),
                  document.getElementById("earth-structure-section"),
                  document.getElementById("map-section"),
                  document.getElementById("country-detail-section")];

// Scroll to section on dot click
dots.forEach((dot, i) => {
  dot.addEventListener("click", () => {
    sections[i].scrollIntoView({ behavior: "smooth" });
  });
});

// Highlight active dot on scroll
window.addEventListener("scroll", () => {
  const scrollPos = window.scrollY + window.innerHeight / 2;

  sections.forEach((sec, idx) => {
    const top = sec.offsetTop;
    const bottom = top + sec.offsetHeight;

    if (scrollPos >= top && scrollPos < bottom) {
      dots.forEach(d => d.classList.remove("active"));
      dots[idx].classList.add("active");
    }
  });
});


/* =========================
   TOOLTIP
========================= */
const tooltip = d3.select("#globe-tooltip");


/* =========================
   PAGE 2: EARTH LAYERS PLOT
========================= */
const layers = [
  { name: "Crust",        color: "#d2c6a4", description: "Earth’s outer crust: thin and rigid",                         innerRadius: 130, outerRadius: 150 },
  { name: "Lithosphere",  color: "#8e8174", description: "Lithosphere: crust + upper mantle, rigid tectonic plates",    innerRadius: 100, outerRadius: 130 },
  { name: "Asthenosphere",color: "#5b4c3d", description: "Asthenosphere: partially molten, flows slowly",               innerRadius: 70,  outerRadius: 100 },
  { name: "Mantle",       color: "#3a3637", description: "Mantle: hot, convecting rock that makes up most of Earth",    innerRadius: 20,  outerRadius: 70  },
];

const width2D = 400;
const height2D = 400;

const svg2D = d3.select("#earth-structure-plot")
  .append("svg")
    .attr("viewBox", `0 0 ${width2D} ${height2D}`)
    .attr("width", "100%")
    .attr("height", "100%")
  .append("g")
    .attr("transform", `translate(${width2D/2}, ${height2D/2})`);

layers.forEach(layer => {
  const arcGen = d3.arc()
    .innerRadius(layer.innerRadius)
    .outerRadius(layer.outerRadius)
    .startAngle(-Math.PI/2)
    .endAngle(Math.PI/2);

  svg2D.append("path")
    .attr("d", arcGen())
    .attr("fill", layer.color)
    .attr("class", "layer-slice")
    .on("mouseover", event => {
      d3.select("#earth-layer-info")
        .html(`<strong>${layer.name}</strong><br>${layer.description}`);
      svg2D.selectAll(".layer-slice").attr("opacity", 0.6);
      d3.select(event.currentTarget).attr("opacity", 1);
    })
    .on("mouseout", () => {
      d3.select("#earth-layer-info").html("Hover over a layer to see details.");
      svg2D.selectAll(".layer-slice").attr("opacity", 1);
    });

  const centroid = arcGen.centroid();
  svg2D.append("text")
    .attr("x", centroid[0] * 1.1)
    .attr("y", centroid[1] * 1.1)
    .attr("text-anchor", centroid[0] > 0 ? "start" : "end")
    .attr("alignment-baseline", "middle")
    .attr("fill", "#fff")
    .style("pointer-events", "none")
    .text(layer.name);
});


/* =========================
   PAGE 3: GLOBE 1 + QUAKES
========================= */
const DATA_URL = "/mnt/data/japan_earthquakes_used.csv"; // <— change if your CSV is elsewhere
const JAPAN_BBOX = { latMin: 24, latMax: 46, lonMin: 122, lonMax: 154 };
const FRAME_MS = 650;   // ms per animation step
const OPACITY  = 0.75;  // point opacity
const R_MIN    = 1.5;   // min radius
const R_MAX    = 7.0;   // max radius

const svg1 = d3.select("#globe-svg");
const path1 = d3.geoPath();
const projection1 = d3.geoOrthographic().clipAngle(90);
let rotate1 = [0, -20];
let lastX1, lastY1;

// Basemap sphere
svg1.append("path")
  .datum({ type: "Sphere" })
  .attr("class", "globe-sphere")
  .attr("fill", "#000")
  .attr("stroke", "#fff")
  .attr("stroke-width", 0.5);

// Countries
const countriesGroup1 = svg1.append("g").attr("class", "countries");

// Group for quakes
const quakesG = svg1.append("g").attr("class", "quakes");

// Size + projection setup
function resizeGlobe1(){
  const cw = svg1.node().parentNode.getBoundingClientRect().width;
  svg1.attr("width", cw).attr("height", cw);
  projection1.translate([cw/2, cw/2]).scale(cw/2 * 0.9);
  path1.projection(projection1);
  svg1.select(".globe-sphere").attr("d", path1);
  svg1.selectAll(".country").attr("d", path1);
  // Update quake positions on resize
  quakesG.selectAll("circle")
    .attr("cx", d => projection1([d.lon, d.lat])[0])
    .attr("cy", d => projection1([d.lon, d.lat])[1]);
}
window.addEventListener("resize", resizeGlobe1);

// Drag to rotate the globe
svg1.call(d3.drag()
  .on("start", event => { lastX1 = event.x; lastY1 = event.y; })
  .on("drag", event => {
    const dx = event.x - lastX1;
    const dy = event.y - lastY1;
    lastX1 = event.x; lastY1 = event.y;
    rotate1[0] += dx * 0.7;
    rotate1[1] -= dy * 0.7;
    rotate1[1] = Math.max(-90, Math.min(90, rotate1[1]));
    projection1.rotate(rotate1);
    svg1.selectAll("path").attr("d", path1);
    // Update quake positions when rotating
    quakesG.selectAll("circle")
      .attr("cx", d => projection1([d.lon, d.lat])[0])
      .attr("cy", d => projection1([d.lon, d.lat])[1]);
  })
);

// Load countries, then init animation
d3.json("https://unpkg.com/world-atlas@2/countries-110m.json").then(worldData => {
  const countries = topojson.feature(worldData, worldData.objects.countries).features;

  countriesGroup1.selectAll(".country")
    .data(countries)
    .enter()
    .append("path")
      .attr("class", "country")
      .attr("fill", "#000")
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.5)
      .on("mouseover", (event, d) => {
        d3.select(event.currentTarget).attr("fill", "#2156e9ff");
        tooltip.text(d.properties.name)
               .style("display","block")
               .style("left", (event.pageX + 10) + "px")
               .style("top",  (event.pageY + 10) + "px");
      })
      .on("mousemove", event => {
        tooltip.style("left", (event.pageX + 10) + "px")
               .style("top",  (event.pageY + 10) + "px");
      })
      .on("mouseout", (event) => {
        d3.select(event.currentTarget).attr("fill", "#000");
        tooltip.style("display","none");
      });

  resizeGlobe1();
  initQuakeAnimation(); // <— start loading and wiring the quakes
});

// ===== Earthquake animation (scroll-triggered) =====
let quakeFrames = [];
let quakeLabels = [];
let quakeTimer = null;
let quakeIdx = 0;
let rScale = d3.scaleLinear().domain([0,6]).range([R_MIN, R_MAX]);

async function initQuakeAnimation(){
  // Load CSV with d3 (no Papa Parse needed)
  let rows = await d3.csv(DATA_URL, d3.autoType);

  if (!rows || !rows.length) return;

  // Normalise column names
  const sample = rows[0] || {};
  const has = k => Object.prototype.hasOwnProperty.call(sample, k);
  const latKey  = has("lat") ? "lat" : (has("latitude") ? "latitude" : null);
  const lonKey  = has("lon") ? "lon" : (has("longitude") ? "longitude" : null);
  const timeKey = has("time") ? "time" : (has("timestamp") ? "timestamp" : (has("date") ? "date" : null));
  const magKey  = has("mag") ? "mag" : (has("magnitude") ? "magnitude" : null);
  const placeKey= has("place") ? "place" : null;

  if (!latKey || !lonKey || !timeKey) return;

  // Clean + Japan bbox
  rows = rows.filter(d =>
    Number.isFinite(+d[latKey]) && Number.isFinite(+d[lonKey]) &&
    d[latKey] >= JAPAN_BBOX.latMin && d[latKey] <= JAPAN_BBOX.latMax &&
    d[lonKey] >= JAPAN_BBOX.lonMin && d[lonKey] <= JAPAN_BBOX.lonMax
  ).map(d => ({
    t: new Date(d[timeKey]),
    lat: +d[latKey],
    lon: +d[lonKey],
    mag: magKey ? (+d[magKey] || null) : null,
    place: placeKey ? d[placeKey] : ""
  })).filter(d => d.t.toString() !== "Invalid Date");

  if (!rows.length) return;

  // Radius scale from magnitude
  const magExtent = d3.extent(rows, d => d.mag ?? 0);
  rScale = d3.scaleLinear()
    .domain([Math.max(0, magExtent[0] ?? 0), Math.max(1, magExtent[1] ?? 6)])
    .range([R_MIN, R_MAX]);

  // Choose time step automatically
  const spanDays = (d3.max(rows, d => d.t) - d3.min(rows, d => d.t)) / 86400000;
  let gran = "monthly", fmt = d3.timeFormat("%Y-%m");
  if (spanDays <= 31) { gran = "daily";  fmt = d3.timeFormat("%Y-%m-%d"); }
  else if (spanDays <= 180) { gran = "weekly"; fmt = d3.timeFormat("Week of %Y-%m-%d"); }

  const keyFn = d => {
    if (gran === "daily")  return d3.timeDay.floor(d.t).toISOString();
    if (gran === "weekly") return d3.timeMonday.floor(d.t).toISOString();
    return d3.timeMonth.floor(d.t).toISOString();
  };

  const groups = d3.group(rows, keyFn);
  const keys = Array.from(groups.keys()).sort((a,b) => new Date(a) - new Date(b));
  quakeFrames = keys.map(k => groups.get(k));
  quakeLabels = keys.map(k => fmt(new Date(k)));

  // Initial draw
  renderQuakeFrame(0);

  // Scroll trigger
  const section = document.getElementById("map-section");
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting && e.intersectionRatio >= 0.5) playQuakes();
      else pauseQuakes();
    });
  }, { threshold: [0, 0.5, 1] });
  io.observe(section);
}

function renderQuakeFrame(i){
  const data = quakeFrames[i] || [];

  // JOIN
  const sel = quakesG.selectAll("circle")
    .data(data, d => d.t.getTime() + "-" + d.lon + "-" + d.lat);

  // EXIT
  sel.exit()
    .transition().duration(250)
    .attr("opacity", 0)
    .remove();

  // UPDATE
  sel.transition().duration(300)
    .attr("cx", d => projection1([d.lon, d.lat])[0])
    .attr("cy", d => projection1([d.lon, d.lat])[1])
    .attr("r",  d => rScale(d.mag ?? 0))
    .attr("opacity", OPACITY);

  // ENTER
  sel.enter()
    .append("circle")
    .attr("cx", d => projection1([d.lon, d.lat])[0])
    .attr("cy", d => projection1([d.lon, d.lat])[1])
    .attr("r", 0)
    .attr("fill", "rgba(255,87,87,0.9)")
    .attr("stroke", "#fff")
    .attr("stroke-width", 0.4)
    .attr("opacity", 0)
    .on("mouseover", function (event, d) {
      const [x, y] = [event.pageX + 12, event.pageY + 12];
      tooltip
        .style("display", "block")
        .style("left", x + "px")
        .style("top",  y + "px")
        .html(`
          <div><strong>${(d.place || "Location")}</strong></div>
          <div>${d.t.toISOString().slice(0,19).replace("T"," ")}</div>
          <div>Mag: ${d.mag != null ? d.mag.toFixed(1) : "N/A"}</div>
          <div>Lat: ${d.lat.toFixed(3)}, Lon: ${d.lon.toFixed(3)}</div>
        `);
      d3.select(this).attr("stroke-width", 1.2);
    })
    .on("mousemove", function (event) {
      tooltip.style("left", (event.pageX + 12) + "px")
             .style("top",  (event.pageY + 12) + "px");
    })
    .on("mouseout", function () {
      tooltip.style("display", "none");
      d3.select(this).attr("stroke-width", 0.4);
    })
    .transition().duration(350)
    .attr("opacity", OPACITY)
    .attr("r", d => rScale(d.mag ?? 0));
}

function playQuakes(){
  if (quakeTimer || !quakeFrames.length) return;
  renderQuakeFrame(quakeIdx);
  quakeTimer = setInterval(() => {
    quakeIdx = (quakeIdx + 1) % quakeFrames.length;
    renderQuakeFrame(quakeIdx);
  }, FRAME_MS);
}

function pauseQuakes(){
  if (quakeTimer) { clearInterval(quakeTimer); quakeTimer = null; }
}


/* =========================
   PAGE 4: GLOBE 2 + CONNECTOR
========================= */
const svg2 = d3.select("#globe-svg-2");
const path2 = d3.geoPath();
const projection2 = d3.geoOrthographic().clipAngle(90);
let rotate2 = [0, -20];
let lastX2, lastY2;

svg2.append("path")
  .datum({ type: "Sphere" })
  .attr("class", "globe-sphere")
  .attr("fill", "#000")
  .attr("stroke", "#fff")
  .attr("stroke-width", 0.5);

const countriesGroup2 = svg2.append("g").attr("class", "countries");
const countryMapSvg = d3.select("#country-map");

let selectedCountry = null;
let connectorPath = null;

d3.json("https://unpkg.com/world-atlas@2/countries-110m.json").then(worldData => {
  const countries = topojson.feature(worldData, worldData.objects.countries).features;

  countriesGroup2.selectAll(".country")
    .data(countries)
    .enter()
    .append("path")
      .attr("class", "country")
      .attr("fill", "#000")
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.5)
      .on("mouseover", (event, d) => {
        if (d !== selectedCountry) d3.select(event.currentTarget).attr("fill", "#2156e9ff");
        tooltip.text(d.properties.name)
               .style("display","block")
               .style("left", (event.pageX + 10) + "px")
               .style("top",  (event.pageY + 10) + "px");
      })
      .on("mousemove", event => {
        tooltip.style("left", (event.pageX + 10) + "px")
               .style("top",  (event.pageY + 10) + "px");
      })
      .on("mouseout", (event, d) => {
        if (d !== selectedCountry) d3.select(event.currentTarget).attr("fill", "#000");
        tooltip.style("display","none");
      })
      .on("click", (event, d) => {
        if (selectedCountry) {
          countriesGroup2.selectAll(".country")
            .filter(c => c.properties.name === selectedCountry.properties.name)
            .attr("fill", "#000");
        }
        d3.select(event.currentTarget).attr("fill", "#ffb347");
        selectedCountry = d;

        d3.select("#country-name").text(d.properties.name);
        d3.select("#country-details").text(`You clicked on ${d.properties.name}.`);

        // draw country map
        countryMapSvg.selectAll("*").remove();
        const cw = countryMapSvg.node().getBoundingClientRect().width;
        const ch = countryMapSvg.node().getBoundingClientRect().height;
        const countryProjection = d3.geoMercator().fitSize([cw, ch], d);
        const countryPath = d3.geoPath().projection(countryProjection);

        countryMapSvg.append("path")
          .datum(d)
          .attr("d", countryPath)
          .attr("fill", "#2156e9ff")
          .attr("stroke", "#000")
          .attr("stroke-width", 1);

        drawConnector();
      });

  resizeGlobe2();
});

// Connector Globe 2 + Country
function drawConnector(){
  // remove existing
  if (connectorPath) connectorPath.remove();

  const globeSvg = d3.select("#globe-svg-2").node();
  const countrySvg = d3.select("#country-map").node();
  const gBBox = globeSvg.getBoundingClientRect();
  const cBBox = countrySvg.getBoundingClientRect();

  const startX = gBBox.x + gBBox.width;
  const startY = gBBox.y + gBBox.height / 2;
  const endX = cBBox.x;
  const endY = cBBox.y + cBBox.height / 2;

  const connectorSvg = d3.select("#line-connector");

  connectorPath = connectorSvg.append("path")
    .attr("d", `M${startX},${startY} L${endX},${endY}`)
    .attr("fill", "none")
    .attr("stroke", "#fff")
    .attr("stroke-width", 2)
    .attr("stroke-dasharray", function() {
      const len = this.getTotalLength();
      return `${len} ${len}`;
    })
    .attr("stroke-dashoffset", function() {
      return this.getTotalLength();
    });

  connectorPath.transition()
    .duration(1000)
    .ease(d3.easeLinear)
    .attr("stroke-dashoffset", 0);
}

svg2.call(d3.drag()
  .on("start", event => { lastX2 = event.x; lastY2 = event.y; })
  .on("drag", event => {
    const dx = event.x - lastX2;
    const dy = event.y - lastY2;
    lastX2 = event.x; lastY2 = event.y;
    rotate2[0] += dx * 0.7;
    rotate2[1] -= dy * 0.7;
    rotate2[1] = Math.max(-90, Math.min(90, rotate2[1]));
    projection2.rotate(rotate2);
    svg2.selectAll("path").attr("d", path2);

    // remove connector when globe moves
    if (connectorPath) {
      connectorPath.remove();
      connectorPath = null;
    }
  })
);

function resizeGlobe2(){
  const cw = svg2.node().parentNode.getBoundingClientRect().width;
  svg2.attr("width", cw).attr("height", cw);
  projection2.translate([cw/2, cw/2]).scale(cw/2 * 0.9);
  path2.projection(projection2);
  svg2.select(".globe-sphere").attr("d", path2);
  svg2.selectAll(".country").attr("d", path2);

  // optionally redraw connector if country is selected
  if (selectedCountry) drawConnector();
}
window.addEventListener("resize", resizeGlobe2);
window.addEventListener("scroll", () => {
  if (selectedCountry) drawConnector();
});
