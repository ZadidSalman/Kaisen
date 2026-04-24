import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function debugAT() {
    const cleanAnime = "Kimetsu no Yaiba";
    const include = 'animethemes.animethemeentries.videos,images,studios,series,animethemes.song.artists';
    const searchUrl = `https://api.animethemes.moe/animetheme?q=Ugly&include=anime,song,animethemeentries.videos`;
    const res = await fetch(searchUrl, { headers: { 'User-Agent': 'Kaikansen/1.0.0' } });
    const data = await res.json() as any;
    if (data.animethemes) {
        for (const t of data.animethemes) {
            console.log("Anime Name:", t.anime?.name);
            console.log("  Theme Song:", t.song?.title);
        }
    }
}

debugAT();
