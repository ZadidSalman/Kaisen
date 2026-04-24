const rawList = `🏆 The Top 10 "All-Time" Hall of Fame
A Cruel Angel's Thesis – Neon Genesis Evangelion
Unravel – Tokyo Ghoul
Again – Fullmetal Alchemist: Brotherhood`;

const lines = rawList.split('\n');
const pairs: any[] = [];
lines.forEach(line => {
    line = line.trim();
    console.log("Analyzing:", line);
    if (!line || line.startsWith('🏆')) return;
    const dashParts = line.split(/\s*[–\-]+\s*/);
    console.log("dashParts:", dashParts);
    if (dashParts.length >= 2) {
      const song = dashParts[0].trim().replace(/"/g, '')
      const anime = dashParts.slice(1).join('-').trim().replace(/\s*\(.*?\)$/, '') // Remove trailing notes like "(The king of the cliffhanger)"
      pairs.push({ song, anime })
    }
});
console.log("Parsed:", pairs);
