const csvURL = 'https://raw.githubusercontent.com/zie2store/contoh/refs/heads/main/assets/contoh.txt';

// Converts title to slug format
function slugify(text) {
  return text.toLowerCase().replace(/\s+/g, '-');
}

// Load and parse CSV
fetch(csvURL)
  .then(res => res.text())
  .then(csv => {
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',');
    const data = lines.slice(1).map(line => {
      const values = line.split(',');
      const obj = {};
      headers.forEach((h, i) => obj[h.trim()] = values[i]?.trim());
      return obj;
    });

    const params = new URLSearchParams(window.location.search);
    const target = params.keys().next().value; // e.g. ID-title

    if (!target) return;

    const [id, ...slugParts] = target.split('-');
    const matched = data.find(item => item.ID === id && slugify(item.Title) === slugParts.join('-'));

    if (!matched) {
      document.getElementById('viewer').innerHTML = '<p>Document not found.</p>';
      return;
    }

    document.getElementById('doc-title').textContent = matched.Title;
    document.getElementById('doc-thumbnail').src = matched.Thumbnail;

    const desc = `${matched.Description}

A document entitled '${matched.Title}' is written by '${matched.Author}', consisting of '${matched.Slides}' pages. It was uploaded on '${matched.UploadDate}' and has been viewed or downloaded for '${matched.Views}' times. Even, it receives '${matched.Likes}' likes from '${matched.Title}' readers. The document with ID '${matched.ID}' can be seen below.`;

    document.getElementById('doc-description').textContent = desc;

    document.getElementById('iframe-container').innerHTML = `
      <iframe src="${matched.IframeURL}?startSlide=1" width="100%" height="600" frameborder="0" marginwidth="0" marginheight="0" scrolling="no" style="border:1px solid #CCC; border-width:1px; margin-bottom:5px; max-width:100%;" allowfullscreen></iframe>
    `;

    // Related posts
    const related = data.filter(item =>
      item.ID !== matched.ID &&
      item.Title.toLowerCase().includes(matched.Title.split(' ')[0].toLowerCase()) // naive relevance
    ).slice(0, 9); // 3x3

    const relatedContainer = document.getElementById('related-posts');
    related.forEach(post => {
      const slug = slugify(post.Title);
      const link = `slideshow.html?${post.ID}-${slug}`;
      const shortDesc = post.Description.length > 100 ? post.Description.substring(0, 100) + '…' : post.Description;

      relatedContainer.innerHTML += `
        <div class="grid-item">
          <a href="${link}">
            <img src="${post.Thumbnail}" alt="${post.Title}">
            <h3>${post.Title}</h3>
            <p>${shortDesc}</p>
          </a>
        </div>
      `;
    });
  })
  .catch(error => {
    console.error('Failed to load CSV:', error);
  });
