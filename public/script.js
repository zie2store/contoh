const urlParams = new URLSearchParams(window.location.search);
const query = urlParams.toString();
const docId = query.split('-')[0]; // Get ID from ?ID-title

const csvUrl = "https://raw.githubusercontent.com/zie2store/contoh/refs/heads/main/assets/contoh.csv";

fetch(csvUrl)
  .then(res => res.text())
  .then(csv => {
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());

    const data = lines.slice(1).map(line => {
      const parts = line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/); // handle commas in quotes
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = (parts[i] || "").replace(/^"|"$/g, "").trim();
      });
      return obj;
    });

    const matched = data.find(row => row.ID === docId);

    if (!matched) {
      document.querySelector("#viewer").innerHTML = `<h2>Document not found.</h2>`;
      return;
    }

    // Populate viewer
    document.querySelector("h1").textContent = matched.Title;
    document.querySelector("#thumb").src = matched.Thumbnail;
    document.querySelector("#desc").textContent = 
      matched.Description + "\n\n" +
      `A document entitled '${matched.Title}' is written by '${matched.Author}', consisting of '${matched.Slides}' pages. It was uploaded on '${matched.UploadDate}' and has been viewed or downloaded for '${matched.Views}' times. Even, it receives '${matched.Likes}' likes from '${matched.Title}' readers. The document with ID '${matched.ID}' can be seen below.`;

    document.querySelector("#iframe").src = matched.IframeURL + "?startSlide=1";

    // Related Posts
    const related = data
      .filter(r => r.ID !== matched.ID && matched.Title.toLowerCase().includes(r.Title.split(' ')[0].toLowerCase()))
      .slice(0, 9);

    const grid = document.querySelector("#related");
    related.forEach(item => {
      const slug = item.Title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');
      const url = `slideshow.html?${item.ID}-${slug}`;
      const div = document.createElement("div");
      div.className = "related-item";
      div.innerHTML = `
        <a href="${url}">
          <img src="${item.Thumbnail}" alt="${item.Title}">
          <h4>${item.Title}</h4>
          <p>${item.Description.slice(0, 100)}...</p>
        </a>
      `;
      grid.appendChild(div);
    });

  })
  .catch(error => {
    document.querySelector("#viewer").innerHTML = `<h2>Error loading data.</h2>`;
    console.error("Failed to load CSV:", error);
  });
