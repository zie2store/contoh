document.addEventListener(&quot;DOMContentLoaded&quot;, () =&gt; {
  const urlParams = new URLSearchParams(window.location.search);
  const watchParam = urlParams.get(&quot;watch&quot;);
  const tvParam = urlParams.get(&quot;tv&quot;);
  const q = (urlParams.get(&quot;q&quot;) || &quot;&quot;).toLowerCase();
  const sport = urlParams.get(&quot;sport&quot;) || &quot;&quot;;

  const searchInput = document.getElementById(&quot;search&quot;);
  const sportFilter = document.getElementById(&quot;sport-filter&quot;);
  const countryFilter = document.getElementById(&quot;country-filter&quot;);
  const playerContainer = document.getElementById(&quot;player-container&quot;);
      
      

  // Set default values
  if (searchInput) searchInput.value = q;
  if (sportFilter) sportFilter.value = sport;
  if (countryFilter) countryFilter.value = tvParam || &quot;&quot;;

  // === Handle ?tv behavior
  if (tvParam !== null) {
    if (sportFilter) sportFilter.style.display = &quot;none&quot;;
    if (countryFilter) countryFilter.style.display = &quot;block&quot;;

    if (searchInput) {
      searchInput.placeholder = &quot;Search ur favorite channel&quot;;

      searchInput.addEventListener(&quot;click&quot;, () =&gt; {
        const currentParams = new URLSearchParams(window.location.search);
        if (!currentParams.has(&quot;tv&quot;)) currentParams.set(&quot;tv&quot;, &quot;&quot;);
        if (!currentParams.has(&quot;q&quot;)) currentParams.set(&quot;q&quot;, &quot;&quot;);
        history.replaceState(null, &quot;&quot;, `/?${currentParams.toString()}`);
      });

      searchInput.addEventListener(&quot;input&quot;, () =&gt; {
        const currentParams = new URLSearchParams(window.location.search);
        if (window.location.search.includes(&quot;tv=&quot;) &amp;&amp; !window.location.search.includes(&quot;watch=&quot;)) {
          currentParams.set(&quot;q&quot;, searchInput.value);
          history.replaceState(null, &quot;&quot;, `/?${currentParams.toString()}`);
          applyChannelUpdate();
        }
      });
    }

  // === Handle ?watch behavior (FIXED)
  } else if (watchParam !== null) {
    if (sportFilter) sportFilter.style.display = &quot;block&quot;;
    if (countryFilter) countryFilter.style.display = &quot;none&quot;;

    if (searchInput) {
      searchInput.placeholder = &quot;Search Team, League, Tournament, or Sport&quot;;

      // Click resets to just ?q=
      searchInput.addEventListener(&quot;click&quot;, () =&gt; {
        const currentParams = new URLSearchParams();
        currentParams.set(&quot;q&quot;, &quot;&quot;);
        history.replaceState(null, &quot;&quot;, `/?${currentParams.toString()}`);
      });

      // On typing, update URL to ?q=... only
      searchInput.addEventListener(&quot;input&quot;, () =&gt; {
        const keyword = searchInput.value.trim();
        const newURL = `/?q=${encodeURIComponent(keyword)}`;
        history.replaceState(null, &quot;&quot;, newURL);
      });

      // Press Enter: go to homepage with ?q=
      searchInput.addEventListener(&quot;keypress&quot;, (e) =&gt; {
        if (e.key === &quot;Enter&quot;) {
          const keyword = searchInput.value.trim();
          if (keyword !== &quot;&quot;) {
            window.location.href = `/?q=${encodeURIComponent(keyword)}`;
          }
        }
      });
    }

  // === Default Schedule view (no ?tv, no ?watch)
  } else {
    if (sportFilter) sportFilter.style.display = &quot;block&quot;;
    if (countryFilter) countryFilter.style.display = &quot;none&quot;;

    if (searchInput) {
      searchInput.addEventListener(&quot;input&quot;, onSearchFilterChange);
    }
  }

  if (sportFilter) sportFilter.addEventListener(&quot;change&quot;, onSearchFilterChange);
  if (countryFilter) countryFilter.addEventListener(&quot;change&quot;, onCountryFilterChange);

  // === Load data logic
  if (!tvParam &amp;&amp; !watchParam) fetchMatchSchedule();
  if (watchParam) loadWatchPlayer(watchParam);
  if (tvParam &amp;&amp; !isValidUrl(tvParam)) loadChannels(tvParam);
     
      

// ========== Schedule ==========

let originalData = [];

function fetchMatchSchedule() {
  fetch(&quot;https://beta.adstrim.ru/api/events&quot;)
    .then(res =&gt; res.json())
    .then(json =&gt; {
      originalData = (json.data || []).filter(item =&gt; {
        return !shouldDismiss(item.timestamp);
      });

      const filtered = applySearchFilter();
      renderCards(filtered);
    })
    .catch(err =&gt; console.error(&quot;Schedule API error:&quot;, err));
}

function applySearchFilter() {
  const q = document.getElementById(&quot;search&quot;)?.value.trim().toLowerCase() || &quot;&quot;;
  const sportFilterValue = document.getElementById(&quot;sport-filter&quot;)?.value || &quot;&quot;;

  return originalData.filter(item =&gt; {
    const home = (item.home_team || &quot;&quot;).toLowerCase();
    const away = (item.away_team || &quot;&quot;).toLowerCase();
    const league = (item.league || &quot;&quot;).toLowerCase();
    const sport = (item.sport || &quot;&quot;).toLowerCase();

    const matchesSearch =
      !q ||
      home.includes(q) ||
      away.includes(q) ||
      league.includes(q) ||
      sport.includes(q);

    const matchesSport =
      !sportFilterValue || item.sport === sportFilterValue;

    return matchesSearch &amp;&amp; matchesSport;
  });
}

function renderCards(data) {
  const container = document.getElementById(&quot;schedule-container&quot;);
  if (!container) return;

  container.innerHTML = &quot;&quot;;

  if (!data.length) {
    container.innerHTML =
      &quot;<div class='message-box'>No matches found.</div>&quot;;
    return;
  }

  data.forEach(item =&gt; {
    const matchDisplay = item.home_team + &quot; vs &quot; + item.away_team;

    const card = document.createElement(&quot;div&quot;);
    card.className = &quot;card&quot;;

    card.innerHTML = `
      <div class='info'>
        <p>${item.sport} | ${item.league}</p>
        <p class='match'>${matchDisplay}</p>
        <p>
          ${formatDate(item.timestamp)} |
          ${new Date(item.timestamp * 1000).toLocaleTimeString([], {
            hour: &quot;2-digit&quot;,
            minute: &quot;2-digit&quot;
          })}
        </p>
      </div>

      <div class='watch-section'>
        <button class='watch-button' onclick='toggleStreams(this)'>Watch</button>
      </div>

      <div class='stream-buttons' style='display:none;'>
        ${(item.channels || []).slice(0, 3).map((ch, i) =&gt; `
          <a href='/?watch=${encodeURIComponent(             &quot;https://topembed.pw/channel/&quot; + ch.name           )}' target='_blank'>
            <button class='stream-button'>
              ${ch.name || &quot;Live &quot; + (i + 1)}
            </button>
          </a>
        `).join(&quot;&quot;)}
      </div>
    `;

    container.appendChild(card);
  });
}

window.toggleStreams = function (btn) {
  const card = btn.closest(&quot;.card&quot;);
  const container = card.querySelector(&quot;.stream-buttons&quot;);
  if (!container) return;

  container.style.display =
    container.style.display === &quot;block&quot; ? &quot;none&quot; : &quot;block&quot;;
};


function formatDate(unix) {
  const d = new Date(unix * 1000);
  const now = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(now.getDate() + 1);

  if (d.toDateString() === now.toDateString()) return &quot;Today&quot;;
  if (d.toDateString() === tomorrow.toDateString()) return &quot;Tomorrow&quot;;
  return d.toLocaleDateString(&quot;en-US&quot;, { month: &quot;long&quot;, day: &quot;numeric&quot; });
}

function shouldDismiss(unix) {
  return Date.now() &gt; (unix * 1000 + 3 * 60 * 60 * 1000);
}

function toggleStreams(btn) {
  const container = btn.parentElement.nextElementSibling;
  container.style.display = container.style.display === &quot;block&quot; ? &quot;none&quot; : &quot;block&quot;;
}

function formatDate(unix) {
  const d = new Date(unix * 1000);
  const now = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(now.getDate() + 1);

  if (d.toDateString() === now.toDateString()) return &quot;Today&quot;;
  if (d.toDateString() === tomorrow.toDateString()) return &quot;Tomorrow&quot;;
  return d.toLocaleDateString(&quot;en-US&quot;, { month: &quot;long&quot;, day: &quot;numeric&quot; });
}

function shouldDismiss(unix) {
  const now = Date.now();
  return now &gt; (unix * 1000 + 3 * 60 * 60 * 1000); // older than 3 hours
}

// ========== Player ==========

function loadWatchPlayer(url) {
  const playerContainer = document.getElementById(&quot;player-container&quot;);
  if (!isValidUrl(url) || !playerContainer) return;

  const wrapper = document.createElement(&quot;div&quot;);
  wrapper.className = &quot;video-responsive&quot;;

  const iframe = document.createElement(&quot;iframe&quot;);
  iframe.src = url;
  iframe.setAttribute(&quot;allow&quot;, &quot;encrypted-media; fullscreen&quot;);
  iframe.setAttribute(&quot;scrolling&quot;, &quot;no&quot;);
  iframe.setAttribute(&quot;frameborder&quot;, &quot;0&quot;);
  iframe.setAttribute(&quot;allowfullscreen&quot;, &quot;&quot;);


  wrapper.appendChild(iframe);
  playerContainer.appendChild(wrapper);
}

// ========== Channels ==========

function loadChannels(countryFilter) {
  fetch(&quot;https://cdn.jsdelivr.net/gh/zie2store/topem/channels.json&quot;)
    .then(res =&gt; res.json())
    .then(data =&gt; {
      window.allChannels = data;
      applyChannelUpdate();
    })
    .catch(err =&gt; console.error(&quot;Failed to load channels:&quot;, err));
}

function applyChannelUpdate() {
  const grid = document.getElementById(&quot;channelGrid&quot;);
  if (!grid) return;
  grid.innerHTML = &quot;&quot;;

  const q = (document.getElementById(&quot;search&quot;)?.value || &quot;&quot;).toLowerCase();
  const country = new URLSearchParams(window.location.search).get(&quot;tv&quot;)?.toLowerCase() || &quot;&quot;;

  let filtered = window.allChannels || [];

  if (country !== &quot;all&quot;) {
    filtered = filtered.filter(c =&gt; c.Country?.toLowerCase() === country);
  }

  if (q) {
    filtered = filtered.filter(c =&gt;
      c.ChannelName?.toLowerCase().includes(q) ||
      c.Country?.toLowerCase().includes(q)
    );
  }

  if (filtered.length === 0) {
    const msg = document.createElement(&quot;div&quot;);
    msg.className = &quot;message-box&quot;;
    msg.innerText = &quot;No channels found.&quot;;
    grid.appendChild(msg);
    return;
  }

  filtered.forEach(c =&gt; {
    const a = document.createElement(&quot;a&quot;);
    a.href = `${window.location.origin}/?watch=${encodeURIComponent(c.URL)}`;
    a.className = &quot;cardtv&quot;;
    a.target = &quot;_blank&quot;;
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
  const q = document.getElementById(&quot;search&quot;)?.value || &quot;&quot;;
  const sport = document.getElementById(&quot;sport-filter&quot;)?.value || &quot;&quot;;

  const params = new URLSearchParams();
  if (q) params.set(&quot;q&quot;, q);
  if (sport) params.set(&quot;sport&quot;, sport);

  const isWatch = new URLSearchParams(window.location.search).get(&quot;watch&quot;);
  if (isWatch) {
    window.location.href = `/?${params.toString()}`;
  } else {
    history.replaceState(null, &quot;&quot;, `/?${params.toString()}`);
    const filtered = applySearchFilter();
    renderCards(filtered);
  }
}

function onCountryFilterChange() {
  const selected = document.getElementById(&quot;country-filter&quot;).value;
  window.location.href = selected ? `/?tv=${encodeURIComponent(selected.toLowerCase())}` : &quot;/&quot;;
}
      

      // ===BATAS EDIT DI SINI ========
      
   document.addEventListener(&#39;DOMContentLoaded&#39;, function () {
    const lightIcon = &#39;https://cdn-icons-png.flaticon.com/128/5043/5043139.png&#39;;
    const darkIcon = &#39;https://cdn-icons-png.flaticon.com/128/5043/5043094.png&#39;;
    const container = document.getElementById(&#39;darkToggleBtn&#39;);

    if (!container) return;

    function updateButtonIcon(isDark) {
      const img = document.createElement(&#39;img&#39;);
      img.src = isDark ? darkIcon : lightIcon;
      img.alt = isDark ? &#39;Dark Mode&#39; : &#39;Light Mode&#39;;
      img.width = 24;
      img.height = 24;

      const btn = document.createElement(&#39;button&#39;);
      btn.className = &#39;dark-toggle&#39;;
      btn.title = &#39;Toggle Dark Mode&#39;;
      btn.appendChild(img);
      btn.onclick = toggleDarkMode;

      container.innerHTML = &#39;&#39;;
      container.appendChild(btn);
    }

    function applyTheme(isDark) {
      document.body.classList.toggle(&#39;dark-mode&#39;, isDark);
      document.documentElement.classList.toggle(&#39;dark-mode&#39;, isDark);
      updateButtonIcon(isDark);
    }

    function toggleDarkMode() {
      const isDark = !document.body.classList.contains(&#39;dark-mode&#39;);
      applyTheme(isDark);
      localStorage.setItem(&#39;theme&#39;, isDark ? &#39;dark&#39; : &#39;light&#39;);
    }

    // Determine preferred theme
    const storedTheme = localStorage.getItem(&#39;theme&#39;);
    let isDark = false;

    if (storedTheme === &#39;dark&#39;) {
      isDark = true;
    } else if (storedTheme === &#39;light&#39;) {
      isDark = false;
    } else {
      // No preference stored: use system preference
      isDark = window.matchMedia &amp;&amp; window.matchMedia(&#39;(prefers-color-scheme: dark)&#39;).matches;
    }

    applyTheme(isDark);
  });

  function toggleMenu() {
    const menu = document.getElementById(&#39;menu&#39;);
    menu.classList.toggle(&#39;show&#39;);
  }
      // === BACK TO TOP ===
      
  const backToTopBtn = document.createElement(&quot;button&quot;);
  backToTopBtn.id = &quot;backToTop&quot;;

  const img = document.createElement(&quot;img&quot;);
  img.src = &quot;https://cdn-icons-png.flaticon.com/128/5610/5610930.png&quot;;
  img.alt = &quot;Back to Top&quot;;
  backToTopBtn.appendChild(img);

  document.body.appendChild(backToTopBtn);

  window.addEventListener(&quot;scroll&quot;, () =&gt; {
    backToTopBtn.style.display = window.scrollY &gt; 300 ? &quot;block&quot; : &quot;none&quot;;
  });

  backToTopBtn.addEventListener(&quot;click&quot;, () =&gt; {
    window.scrollTo({ top: 0, behavior: &quot;smooth&quot; });
  });
      
      // ==IKLAN POPUP==
      const popunderLinks = [
      &quot;https://s.shopee.co.id/6VDKAAFgGL&quot;,
      &quot;https://s.shopee.co.id/9KVEWWk1IR&quot;,
      &quot;https://s.shopee.co.id/9UpTbj6qtb&quot;,
      &quot;https://s.shopee.co.id/7fPHYPASv2&quot;,
      &quot;https://s.shopee.co.id/8ztD0kPDjF&quot;,
      &quot;https://s.shopee.co.id/5pwBEq85KO&quot;
        ];

        function openRandomPopunder() {
            const randomIndex = Math.floor(Math.random() * popunderLinks.length);
            const linkToOpen = popunderLinks[randomIndex]; 
            const newTab = window.open(linkToOpen, &quot;_blank&quot;); 

            if (newTab) {
                newTab.blur(); 
                window.focus();
            }
        }
        function shouldShowPopunder() {
            const lastShown = localStorage.getItem(&#39;lastPopunderTime&#39;);
            const currentTime = Date.now();

            if (!lastShown || currentTime - lastShown &gt; 3 * 60 * 1000) {
                localStorage.setItem(&#39;lastPopunderTime&#39;, currentTime);
                return true;
            }
            return false;
        }
        function addClickEventToDocument() {
            document.addEventListener(&quot;click&quot;, function(event) {
                if (shouldShowPopunder()) {
                    openRandomPopunder();
                }
            });
        }
        window.onload = addClickEventToDocument;
      
    // == RANDOM COLOR ===
    const colors = [&quot;#f59e0b&quot;, &quot;#10b981&quot;, &quot;#3b82f6&quot;, &quot;#ec4899&quot;, &quot;#8b5cf6&quot;, &quot;#ef4444&quot;, &quot;#14b8a6&quot;, &quot;#f87171&quot;, &quot;#fbbf24&quot;, &quot;#34d399&quot;, &quot;#60a5fa&quot;, &quot;#a78bfa&quot;, &quot;#f472b6&quot;, &quot;#fb923c&quot;, &quot;#2dd4bf&quot;];
    document.querySelectorAll(&quot;.trending-tag&quot;).forEach(tag =&gt; {
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
      
      //====== dark mode =====
      
	const lightIcon = &#39;https://cdn-icons-png.flaticon.com/128/5043/5043139.png&#39;;
    const darkIcon = &#39;https://cdn-icons-png.flaticon.com/128/5043/5043094.png&#39;;
    const container = document.getElementById(&#39;darkToggleBtn&#39;);

    if (!container) return;

    function updateButtonIcon(isDark) {
      const img = document.createElement(&#39;img&#39;);
      img.src = isDark ? darkIcon : lightIcon;
      img.alt = isDark ? &#39;Dark Mode&#39; : &#39;Light Mode&#39;;
      img.width = 24;
      img.height = 24;

      const btn = document.createElement(&#39;button&#39;);
      btn.className = &#39;dark-toggle&#39;;
      btn.title = &#39;Toggle Dark Mode&#39;;
      btn.appendChild(img);
      btn.onclick = toggleDarkMode;

      container.innerHTML = &#39;&#39;;
      container.appendChild(btn);
    }

    function toggleDarkMode() {
      const isDark = document.body.classList.toggle(&#39;dark-mode&#39;);
      document.documentElement.classList.toggle(&#39;dark-mode&#39;);
      localStorage.setItem(&#39;theme&#39;, isDark ? &#39;dark&#39; : &#39;light&#39;);
      updateButtonIcon(isDark);
    }

    const isStoredDark = localStorage.getItem(&#39;theme&#39;) === &#39;dark&#39;;
    if (isStoredDark) {
      document.body.classList.add(&#39;dark-mode&#39;);
      document.documentElement.classList.add(&#39;dark-mode&#39;);
    }
    updateButtonIcon(isStoredDark);
  });
