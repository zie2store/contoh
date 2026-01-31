document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const watchParam = urlParams.get("watch");
  const tvParam = urlParams.get("tv");
  const q = (urlParams.get("q") || "").toLowerCase();
  const sport = urlParams.get("sport") || "";

  const searchInput = document.getElementById("search");
  const sportFilter = document.getElementById("sport-filter");
  const countryFilter = document.getElementById("country-filter");
  const playerContainer = document.getElementById("player-container");

  // Set default values
  if (searchInput) searchInput.value = q;
  if (sportFilter) sportFilter.value = sport;
  if (countryFilter) countryFilter.value = tvParam || "";

  // === Handle ?tv behavior
  if (tvParam !== null) {
    if (sportFilter) sportFilter.style.display = "none";
    if (countryFilter) countryFilter.style.display = "block";

    if (searchInput) {
      searchInput.placeholder = "Search ur favorite channel";

      searchInput.addEventListener("click", () => {
        const currentParams = new URLSearchParams(window.location.search);
        if (!currentParams.has("tv")) currentParams.set("tv", "");
        if (!currentParams.has("q")) currentParams.set("q", "");
        history.replaceState(null, "", `/?${currentParams.toString()}`);
      });

      searchInput.addEventListener("input", () => {
        const currentParams = new URLSearchParams(window.location.search);
        if (window.location.search.includes("tv=") && !window.location.search.includes("watch=")) {
          currentParams.set("q", searchInput.value);
          history.replaceState(null, "", `/?${currentParams.toString()}`);
          applyChannelUpdate();
        }
      });
    }

  // === Handle ?watch behavior
  } else if (watchParam !== null) {
    if (sportFilter) sportFilter.style.display = "block";
    if (countryFilter) countryFilter.style.display = "none";

    if (searchInput) {
      searchInput.placeholder = "Search Team, League, Tournament, or Sport";

      searchInput.addEventListener("click", () => {
        const currentParams = new URLSearchParams();
        currentParams.set("q", "");
        history.replaceState(null, "", `/?${currentParams.toString()}`);
      });

      searchInput.addEventListener("input", () => {
        const keyword = searchInput.value.trim();
        const newURL = `/?q=${encodeURIComponent(keyword)}`;
        history.replaceState(null, "", newURL);
      });

      searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          const keyword = searchInput.value.trim();
          if (keyword !== "") {
            window.location.href = `/?q=${encodeURIComponent(keyword)}`;
          }
        }
      });
    }

  // === Default Schedule view
  } else {
    if (sportFilter) sportFilter.style.display = "block";
    if (countryFilter) countryFilter.style.display = "none";

    if (searchInput) {
      searchInput.addEventListener("input", onSearchFilterChange);
    }
  }

  if (sportFilter) sportFilter.addEventListener("change", onSearchFilterChange);
  if (countryFilter) countryFilter.addEventListener("change", onCountryFilterChange);

  // === Load data logic
  if (!tvParam && !watchParam) fetchMatchSchedule();
  if (watchParam) loadWatchPlayer(watchParam);
  if (tvParam && !isValidUrl(tvParam)) loadChannels(tvParam);

  // ========== Schedule ==========
  let originalData = [];

  function fetchMatchSchedule() {
    fetch("https://beta.adstrim.ru/api/events")
      .then(res => res.json())
      .then(json => {
        originalData = (json.data || []).filter(item => !shouldDismiss(item.timestamp));
        const filtered = applySearchFilter();
        renderCards(filtered);
      })
      .catch(err => console.error("Schedule API error:", err));
  }

  function applySearchFilter() {
    const q = document.getElementById("search")?.value.trim().toLowerCase() || "";
    const sportFilterValue = document.getElementById("sport-filter")?.value || "";

    return originalData.filter(item => {
      const home = (item.home_team || "").toLowerCase();
      const away = (item.away_team || "").toLowerCase();
      const league = (item.league || "").toLowerCase();
      const sport = (item.sport || "").toLowerCase();

      const matchesSearch = !q || home.includes(q) || away.includes(q) || league.includes(q) || sport.includes(q);
      const matchesSport = !sportFilterValue || item.sport === sportFilterValue;

      return matchesSearch && matchesSport;
    });
  }

  function renderCards(data) {
    const container = document.getElementById("schedule-container");
    if (!container) return;
    container.innerHTML = "";

    if (!data.length) {
      container.innerHTML = "<div class='message-box'>No matches found.</div>";
      return;
    }

    data.forEach(item => {
      const matchDisplay = item.home_team + " vs " + item.away_team;
      const card = document.createElement("div");
      card.className = "card";

      card.innerHTML = `
        <div class='info'>
          <p>${item.sport} | ${item.league}</p>
          <p class='match'>${matchDisplay}</p>
          <p>
            ${formatDate(item.timestamp)} |
            ${new Date(item.timestamp * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>

        <div class='watch-section'>
          <button class='watch-button' onclick='toggleStreams(this)'>Watch</button>
        </div>

        <div class='stream-buttons' style='display:none;'>
          ${(item.channels || []).slice(0, 3).map((ch, i) => `
            <a href='/?watch=${encodeURIComponent("https://topembed.pw/channel/" + ch.name)}' target='_blank'>
              <button class='stream-button'>${ch.name || "Live " + (i + 1)}</button>
            </a>
          `).join("")}
        </div>
      `;
      container.appendChild(card);
    });
  }

  window.toggleStreams = function(btn) {
    const card = btn.closest(".card");
    const container = card.querySelector(".stream-buttons");
    if (!container) return;
    container.style.display = container.style.display === "block" ? "none" : "block";
  };

  function formatDate(unix) {
    const d = new Date(unix * 1000);
    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(now.getDate() + 1);

    if (d.toDateString() === now.toDateString()) return "Today";
    if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  }

  function shouldDismiss(unix) {
    const now = Date.now();
    return now > (unix * 1000 + 3 * 60 * 60 * 1000);
  }

  // ========== Player ==========
  function loadWatchPlayer(url) {
    const playerContainer = document.getElementById("player-container");
    if (!isValidUrl(url) || !playerContainer) return;

    const wrapper = document.createElement("div");
    wrapper.className = "video-responsive";

    const iframe = document.createElement("iframe");
    iframe.src = url;
    iframe.setAttribute("allow", "encrypted-media; fullscreen");
    iframe.setAttribute("scrolling", "no");
    iframe.setAttribute("frameborder", "0");
    iframe.setAttribute("allowfullscreen", "");

    wrapper.appendChild(iframe);
    playerContainer.appendChild(wrapper);
  }

  // ========== Channels ==========
  function loadChannels(countryFilter) {
    fetch("https://cdn.jsdelivr.net/gh/zie2store/topem/channels.json")
      .then(res => res.json())
      .then(data => {
        window.allChannels = data;
        applyChannelUpdate();
      })
      .catch(err => console.error("Failed to load channels:", err));
  }

  function applyChannelUpdate() {
    const grid = document.getElementById("channelGrid");
    if (!grid) return;
    grid.innerHTML = "";

    const q = (document.getElementById("search")?.value || "").toLowerCase();
    const country = new URLSearchParams(window.location.search).get("tv")?.toLowerCase() || "";

    let filtered = window.allChannels || [];

    if (country !== "all") {
      filtered = filtered.filter(c => c.Country?.toLowerCase() === country);
    }

    if (q) {
      filtered = filtered.filter(c => c.ChannelName?.toLowerCase().includes(q) || c.Country?.toLowerCase().includes(q));
    }

    if (!filtered.length) {
      const msg = document.createElement("div");
      msg.className = "message-box";
      msg.innerText = "No channels found.";
      grid.appendChild(msg);
      return;
    }

    filtered.forEach(c => {
      const a = document.createElement("a");
      a.href = `${window.location.origin}/?watch=${encodeURIComponent(c.URL)}`;
      a.className = "cardtv";
      a.target = "_blank";
      a.innerHTML = `
        <div class='channel-name'>${c.ChannelName}</div>
        <div class='country'>${c.Country}</div>
      `;
      grid.appendChild(a);
    });
  }

  // ========== Helpers ==========
  function isValidUrl(str) {
    return /^https?:\/\//i.test(str);
  }

  function onSearchFilterChange() {
    const q = document.getElementById("search")?.value || "";
    const sport = document.getElementById("sport-filter")?.value || "";

    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (sport) params.set("sport", sport);

    const isWatch = new URLSearchParams(window.location.search).get("watch");
    if (isWatch) {
      window.location.href = `/?${params.toString()}`;
    } else {
      history.replaceState(null, "", `/?${params.toString()}`);
      const filtered = applySearchFilter();
      renderCards(filtered);
    }
  }

  function onCountryFilterChange() {
    const selected = document.getElementById("country-filter").value;
    window.location.href = selected ? `/?tv=${encodeURIComponent(selected.toLowerCase())}` : "/";
  }

  // ========== DARK MODE & UI ==========
  const lightIcon = 'https://cdn-icons-png.flaticon.com/128/5043/5043139.png';
  const darkIcon = 'https://cdn-icons-png.flaticon.com/128/5043/5043094.png';
  const container = document.getElementById('darkToggleBtn');
  if (container) {
    function updateButtonIcon(isDark) {
      const img = document.createElement('img');
      img.src = isDark ? darkIcon : lightIcon;
      img.alt = isDark ? 'Dark Mode' : 'Light Mode';
      img.width = 24; img.height = 24;
      const btn = document.createElement('button');
      btn.className = 'dark-toggle';
      btn.title = 'Toggle Dark Mode';
      btn.appendChild(img);
      btn.onclick = toggleDarkMode;
      container.innerHTML = '';
      container.appendChild(btn);
    }

    function toggleDarkMode() {
      const isDark = document.body.classList.toggle('dark-mode');
      document.documentElement.classList.toggle('dark-mode');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      updateButtonIcon(isDark);
    }

    const isStoredDark = localStorage.getItem('theme') === 'dark';
    if (isStoredDark) {
      document.body.classList.add('dark-mode');
      document.documentElement.classList.add('dark-mode');
    }
    updateButtonIcon(isStoredDark);
  }

  function toggleMenu() {
    const menu = document.getElementById('menu');
    menu.classList.toggle('show');
  }

  // ========== BACK TO TOP ==========
  const backToTopBtn = document.createElement("button");
  backToTopBtn.id = "backToTop";
  const imgBtn = document.createElement("img");
  imgBtn.src = "https://cdn-icons-png.flaticon.com/128/5610/5610930.png";
  imgBtn.alt = "Back to Top";
  backToTopBtn.appendChild(imgBtn);
  document.body.appendChild(backToTopBtn);

  window.addEventListener("scroll", () => {
    backToTopBtn.style.display = window.scrollY > 300 ? "block" : "none";
  });
  backToTopBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // ========== POPUP ADS ==========
  const popunderLinks = [
    "https://s.shopee.co.id/6VDKAAFgGL",
    "https://s.shopee.co.id/9KVEWWk1IR",
    "https://s.shopee.co.id/9UpTbj6qtb",
    "https://s.shopee.co.id/7fPHYPASv2",
    "https://s.shopee.co.id/8ztD0kPDjF",
    "https://s.shopee.co.id/5pwBEq85KO"
  ];

  function openRandomPopunder() {
    const randomIndex = Math.floor(Math.random() * popunderLinks.length);
    const linkToOpen = popunderLinks[randomIndex]; 
    const newTab = window.open(linkToOpen, "_blank"); 
    if (newTab) { newTab.blur(); window.focus(); }
  }

  function shouldShowPopunder() {
    const lastShown = localStorage.getItem('lastPopunderTime');
    const currentTime = Date.now();
    if (!lastShown || currentTime - lastShown > 3 * 60 * 1000) {
      localStorage.setItem('lastPopunderTime', currentTime);
      return true;
    }
    return false;
  }

  function addClickEventToDocument() {
    document.addEventListener("click", function() {
      if (shouldShowPopunder()) openRandomPopunder();
    });
  }

  window.onload = addClickEventToDocument;

  // ========== RANDOM COLORS ==========
  const colors = ["#f59e0b","#10b981","#3b82f6","#ec4899","#8b5cf6","#ef4444","#14b8a6","#f87171","#fbbf24","#34d399","#60a5fa","#a78bfa","#f472b6","#fb923c","#2dd4bf"];
  document.querySelectorAll(".trending-tag").forEach(tag => {
    const bg = colors[Math.floor(Math.random() * colors.length)];
    tag.style.cssText = `
      display:inline-block;
      margin:5px 6px;
      padding:6px 12px;
      border-radius:20px;
      text-decoration:none;
      color:#fff;
      font-size:14px;
      background:${bg};
    `;
  });
});
