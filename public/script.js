const urlParams = new URLSearchParams(window.location.search);
const queryString = urlParams.toString();
const docId = queryString.split('-')[0];

console.log("🔍 Query string:", queryString);
console.log("🔍 Extracted document ID:", docId);

const csvUrl = "https://raw.githubusercontent.com/zie2store/contoh/refs/heads/main/assets/contoh.csv";

fetch(csvUrl)
  .then(res => res.text())
  .then(csv => {
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());

    const data = lines.slice(1).map((line, index) => {
      const parts = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = (parts[i] || "").replace(/^"|"$/g, "").trim();
      });
      return obj;
    });

    const matched = data.find(item => item.ID === docId);

    if (!matched) {
      document.querySelector("#viewer").innerHTML = `<h2>Document not found.</h2>`;
      console.warn("⚠ No document matched for ID:", docId);
      return;
    }

    // --- Display Main Content ---
    document.querySelector("h1").textContent = matched.Title;
    document.querySelector("#thumb").src = matched.Thumbnail;
    document.querySelector("#desc").textContent =
      matched.Description + "\n\n" +
      `A document entitled ${matched.Title} is written by ${matched.Author}, consisting of ${matched.Slides} pages or slides. It was uploaded on ${matched.UploadDate} and has been viewed or downloaded for ${matched.Views} times. Even, it receives ${matched.Likes} likes from the readers of ${matched.Title}. The document with ID ${matched.ID} can be seen below.`;
    document.querySelector("#iframe").src = matched.IframeURL + "?startSlide=1";

    // --- Generate Related Posts ---
    const titleWords = matched.Title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const relevanceScores = data
      .filter(item => item.ID !== matched.ID)
      .map(item => {
        const otherTitle = item.Title.toLowerCase();
        const score = titleWords.reduce((acc, word) => acc + (otherTitle.includes(word) ? 1 : 0), 0);
        return { ...item, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 9);

    const grid = document.querySelector("#related");
    grid.innerHTML = ""; // clear first
    relevanceScores.forEach(item => {
      const slug = item.Title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');
      const link = `slideshow.html?${item.ID}-${slug}`;
      const div = document.createElement("div");
      div.className = "related-item";
      div.innerHTML = `
        <a href="${link}">
          <img src="${item.Thumbnail}" alt="${item.Title}" />
          <h4>${item.Title}</h4>
          <p>${item.Description.slice(0, 160)}...</p>
        </a>`;
      grid.appendChild(div);
    });

  })
  .catch(error => {
    console.error("❌ Failed to load or parse CSV:", error);
    document.querySelector("#viewer").innerHTML = `<h2>Error loading document data.</h2>`;
  });
