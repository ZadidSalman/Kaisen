import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { 
  deriveMood, 
  fetchATResourcePage, 
  parseATTheme, 
  enrichTheme,
  delay,
  AT_DELAY_MS
} from './seed-utils';

dotenv.config({ path: '.env.local' });

const rawList = `
🏆 The Top 10 "All-Time" Hall of Fame
A Cruel Angel's Thesis – Neon Genesis Evangelion
Unravel – Tokyo Ghoul
Again – Fullmetal Alchemist: Brotherhood
Tank! – Cowboy Bebop
Silhouette – Naruto Shippuden
Guren no Yumiya – Attack on Titan
The Hero!! – One Punch Man
Idol – Oshi no Ko
Bling-Bang-Bang-Born – Mashle
Kaikai Kitan – Jujutsu Kaisen
🔥 Modern Titans (2023–2026 Hits)
11. Recollect – Re:Zero Season 4
12. Mirage – Call of the Night Season 2
13. ReawakeR – Solo Leveling S2
14. Watch Me! – Witch Watch
15. HUGs – Gachiakuta
16. Brave – Frieren: Beyond Journey's End
17. Kick Back – Chainsaw Man
18. The Rumbling – Attack on Titan Final Season
19. On The Way – Dan Da Dan S2
20. Zettai Must Danmen – Dorohedoro S2
21. Specialz – Jujutsu Kaisen Season 2
22. Work – Hell's Paradise
23. Where Our Blue Is – Jujutsu Kaisen
24. Idol – Oshi no Ko
25. U – BELLE
⚔️ The Shonen Battle Anthem Essentials
The Day – My Hero Academia
Peace Sign – My Hero Academia
Blue Bird – Naruto Shippuden
Sign – Naruto Shippuden
GO!!! – Naruto
We Are! – One Piece
Over the Top – One Piece
Paint – One Piece
Asterisk – Bleach
Ranbu no Melody – Bleach
Haruka Kanata – Naruto
Black Catcher – Black Clover
Black Rover – Black Clover
Inferno – Fire Force
Gurenge – Demon Slayer
Zankyou Sanka – Demon Slayer
Departure! – Hunter x Hunter
Polaris – My Hero Academia
Touch Off – The Promised Neverland
Odd Future – My Hero Academia
🎷 Groovy, Alternative & Experimental
Kyouran Hey Kids!! – Noragami Aragoto
Bloody Stream – JoJo’s Bizarre Adventure
Great Days – JoJo’s Bizarre Adventure
Stand Proud – JoJo’s Bizarre Adventure
Fly High!! – Haikyuu!!
Gekkan Shoujo Nozaki-kun – Kimi Janakya Dame Mitai
Wild Side – Beastars
Kaibutsu – Beastars
99 – Mob Psycho 100
99.9 – Mob Psycho 100
Colors – Code Geass
World End – Code Geass
Duvet – Serial Experiments Lain
Easy Breezy – Keep Your Hands Off Eizouken!
Lost in Paradise – Jujutsu Kaisen
🏛️ Retro & 90s/00s Classics
Cha-La Head-Cha-La – Dragon Ball Z
Butter-Fly – Digimon Adventure
Hacking to the Gate – Steins;Gate
Inner Universe – Ghost in the Shell: SAC
Sorairo Days – Gurren Lagann
Moonlight Densetsu – Sailor Moon
Sobakasu – Rurouni Kenshin
Catch You Catch Me – Cardcaptor Sakura
To the Beginning – Fate/Zero
Oath Sign – Fate/Zero
Brave Shine – Fate/stay night
Ready Steady Go – Fullmetal Alchemist
Rewrite – Fullmetal Alchemist
Abnormalize – Psycho-Pass
Enigmatic Feeling – Psycho-Pass
🌸 Vibe & Emotional Hits
Hikaru Nara – Your Lie in April
Kawaki wo Ameku – Domestic Girlfriend
Sugar Song to Bitter Step – Kekkai Sensen
Connect – Madoka Magica
Renai Circulation – Bakemonogatari
Mousou Express – Monogatari
Platinum Disco – Monogatari
Sparkle – Your Name
Ao no Sumika – Jujutsu Kaisen
Suzume – Suzume no Tojimari
📜 Deep Cuts & Fan Favorites (86–150)
86. Crossing Field (SAO) | 87. Adamas (SAO) | 88. Ignite (SAO) | 89. Redo (Re:Zero) | 90. Paradisus-Paradoxum (Re:Zero) | 91. Long Shot (Re:Zero) | 92. Styx Helix (Re:Zero) | 93. This Game (No Game No Life) | 94. My Soul, Your Beats! (Angel Beats!) | 95. Kyomu Densen (Another) | 96. Golden Time Lover (FMA:B) | 97. Period (FMA:B) | 98. Hologram (FMA:B) | 99. Rain (FMA:B) | 100. Shikanoko Nokonoko Koshitantan (Deer Child) | 101. O2 (Code Geass) | 102. Core Pride (Blue Exorcist) | 103. In My World (Blue Exorcist) | 104. Ugly (Gachiakuta) | 105. Mephisto (Oshi no Ko) | 106. Fatima (Steins;Gate 0) | 107. Serendipity (Flip Flappers) | 108. Flashback (Kokkoku) | 109. Deal with the Devil (Kakegurui) | 110. Kurenai (X Japan) | 111. Blue Box (Official Hige Dandism) | 112. Mixed Nuts (Spy x Family) | 113. Souvenir (Spy x Family) | 114. White Noise (Tokyo Revengers) | 115. Cry Baby (Tokyo Revengers) | 116. Kizuna no Kiseki (Demon Slayer) | 117. Akeboshi (Demon Slayer) | 118. Mukanjyo (Vinland Saga) | 119. Dark Crow (Vinland Saga) | 120. River (Vinland Saga) | 121. Utopia (Hell's Paradise) | 122. Paper Moon (Soul Eater) | 123. Resonance (Soul Eater) | 124. This Is It (Solo Leveling) | 125. Dark Seeking Light (The World's Finest Assassin) | 126. Dream Lantern (Your Name) | 127. Merry-Go-Round (MHA) | 128. Star Marker (MHA) | 129. No.1 (MHA) | 130. Cinderella (Komi Can't Communicate) | 131. Seishun Kyousoukyoku (Naruto) | 132. Diver (Naruto) | 133. Newsong (Naruto) | 134. Tougenkyou Alien (Gintama) | 135. Sakura Mitsutsuki (Gintama) | 136. Pray (Gintama) | 137. Kagerou (Gintama) | 138. Sense (Platinum End) | 139. Sajou no Hana (Mob Psycho) | 140. Brave Blue (Eureka Seven) | 141. Days (Eureka Seven) | 142. Sakura (Eureka Seven) | 143. Shiver (Mushishi) | 144. Goya no Machiawase (Noragami) | 145. Let Me Hear (Parasyte) | 146. Howling (Darker Than Black) | 147. History Maker (Yuri on Ice) | 148. Paradise (SK8 The Infinity) | 149. Gold (Boruto) | 150. Hero's Come Back!! (Naruto Shippuden)
🏆 The God-Tier (Top 10)
"Roundabout" – JoJo’s Bizarre Adventure
"Lost in Paradise" – Jujutsu Kaisen
"The Real Folk Blues" – Cowboy Bebop
"Fly Me to the Moon" – Neon Genesis Evangelion
"Dango Daikazoku" – Clannad
"Uso" – Fullmetal Alchemist: Brotherhood
"Don't say 'lazy'" – K-On!
"Shiki no Uta" – Samurai Champloo
"I" – My Hero Academia Final Season
"Mephisto" – Oshi no Ko
🔥 Modern Legends (2023–2026)
"you are my monster" – The Summer Hikaru Died
"Hitorigoto" – The Apothecary Diaries Season 2
"Anytime Anywhere" – Frieren: Beyond Journey's End
"Doukashiteru" – Dan Da Dan Season 2
"UN-APEX" – Solo Leveling Season 2
"Actor" – Spy x Family Season 3
"Comedy" – Spy x Family
"Akuma no Ko" – Attack on Titan Final Season
"Shock" – Attack on Titan Final Season
"More Than Words" – Jujutsu Kaisen Season 2
"Kawaii Kaiwai" – My Dress-Up Darling Season 2
"Mahou wa Spice" – Witch Watch
"KONTINUUM" – To Be Hero X
"Contrast" – Blue Box
"Beautiful Colors" – Kaiju No. 8 Season 2
⚔️ Shonen & Seinen Classics
"Sugar Song to Bitter Step" – Kekkai Sensen
"Hunting for Your Dream" – Hunter x Hunter
"Hyori Ittai" – Hunter x Hunter
"Wind" – Naruto
"I Will Give You a Romance" – Dragon Ball
"Fukagyaku Replace" – Nobunaga Concerto
"Ray of Light" – Fullmetal Alchemist: Brotherhood
"Alumina" – Death Note
"Last Theater" – Death Parade
"Memories" – One Piece
"Eternal Pose" – One Piece
"Shura" – Gintama
"Samurai Heart (Some Like It Hot!!)" – Gintama
"Orange" – Haikyuu!!
"Torches" – Vinland Saga
🌌 Vibe, Mystery, & Emotional Weight
"Secret Base (Kimi ga Kureta Mono)" – Anohana
"Heikousen" – Scum's Wish
"Kimi no Shiranai Monogatari" – Bakemonogatari
"Namae no nai Kaibutsu" – Psycho-Pass
"All Alone With You" – Psycho-Pass
"Wareta Ringo" – Shinsekai Yori
"Mosaic Kakera" – Code Geass
"Walk Like an Egyptian" – JoJo’s Bizarre Adventure
"Daisy" – Beyond the Boundary
"I Want You" – JoJo’s Bizarre Adventure Part 4
`;

async function deepSeed() {
  const MONGODB_URI = process.env.MONGODB_URI!;
  if (!MONGODB_URI) throw new Error('MONGODB_URI not set');

  await mongoose.connect(MONGODB_URI, { dbName: 'kaikansen' });
  console.log("Connected to kaikansen DB");

  const ThemeCache = mongoose.models.ThemeCache || mongoose.model('ThemeCache', new mongoose.Schema({
      slug: { type: String, unique: true },
      animethemesId: Number,
      songTitle: String,
      animeTitle: String,
      animeTitleEnglish: String,
      animeTitleAlternative: [String],
      isPopular: Boolean,
      popularRank: Number,
      featuredAt: Date,
      synchedAt: Date,
  }, { strict: false }));

  const lines = rawList.split('\n');
  const pairs: { song: string, anime: string, rank: number }[] = [];
  let manualRank = 1;

  lines.forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('🏆') || line.startsWith('🔥') || line.startsWith('⚔️') || line.startsWith('🎷') || line.startsWith('🏛️') || line.startsWith('🌸') || line.startsWith('📜') || line.startsWith('🌌')) return;
    
    if (line.includes(' | ')) {
      const parts = line.split(' | ');
      parts.forEach(part => {
        const match = part.match(/\d+\.\s+(.+?)\s+\((.+?)\)/);
        if (match) {
          pairs.push({ song: match[1].trim(), anime: match[2].trim(), rank: manualRank });
          manualRank++;
        }
      });
      return;
    }

    line = line.replace(/^\d+\.\s+/, '');
    line = line.replace(/^"/, '').replace(/"\s*–/, ' –');
    
    const dashParts = line.split(/\s*[–\-]+\s*/);
    if (dashParts.length >= 2) {
      const song = dashParts[0].trim().replace(/"/g, '');
      const anime = dashParts.slice(1).join('-').trim().replace(/\s*\(.*?\)$/, '');
      pairs.push({ song, anime, rank: manualRank });
      manualRank++;
    }
  });

  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

  console.log(`Starting deep seed for ${pairs.length} pairs...`);

  for (const pair of pairs) {
    let cleanAnime = pair.anime
      .replace(/season \d+/i, '')
      .replace(/ S\d+/i, '')
      .replace(/ OVA/i, '')
      .replace('2nd Season', '')
      .replace('3rd Season', '')
      .replace('Final Season', '')
      .trim();

    if (cleanAnime === 'FMA:B') cleanAnime = 'Fullmetal Alchemist';
    if (cleanAnime === 'SAO') cleanAnime = 'Sword Art Online';
    if (cleanAnime === 'MHA') cleanAnime = 'My Hero Academia';
    if (cleanAnime === 'Deer Child') cleanAnime = 'Shikanoko';
    if (cleanAnime === 'Fire Force') cleanAnime = 'Enen no Shouboutai';
    if (cleanAnime === 'Dan Da Dan') cleanAnime = 'Dandadan';
    if (cleanAnime === 'Dan Da Dan S2') cleanAnime = 'Dandadan';
    if (cleanAnime === 'Call of the Night') cleanAnime = 'Yofukashi no Uta';
    if (cleanAnime === 'Hell\'s Paradise') cleanAnime = 'Jigokuraku';
    if (cleanAnime === 'Demon Slayer') cleanAnime = 'Kimetsu no Yaiba';
    if (cleanAnime === 'Scum\'s Wish') cleanAnime = 'Kuzu no Honkai';
    if (cleanAnime === 'Monogatari') cleanAnime = 'Nisemonogatari';
    if (cleanAnime === 'Mob Psycho') cleanAnime = 'Mob Psycho 100';
    if (cleanAnime === 'Your Name') cleanAnime = 'Kimi no Na wa.';
    if (cleanAnime === 'Parasyte') cleanAnime = 'Kiseijuu: Sei no Kakuritsu';
    if (cleanAnime === 'Anohana') cleanAnime = 'Ano Hi Mita Hana no Namae wo Bokutachi wa Mada Shiranai.';

    const overrides: Record<string, string> = {
      "A Cruel Angel's Thesis": "Zankoku na Tenshi no Thesis",
      "The Hero!!": "THE HERO !! ~Okoreru Kobushi ni Hi wo Tsukero~",
      "Bling-Bang-Bang-Born": "Bling-Bang-Bang-Born",
      "Bling": "Bling-Bang-Bang-Born",
      "Kimi Janakya Dame Mitai": "Kimi Janakya Dame Mitai",
      "Gekkan Shoujo Nozaki-kun": "Kimi Janakya Dame Mitai",
      "Gekkan Shoujo Nozaki": "Kimi Janakya Dame Mitai",
      "Inner Universe": "inner universe",
      "Sugar Song to Bitter Step": "Sugar Song to Bitter Step",
      "Butter-Fly": "Butter-Fly",
      "Butter": "Butter-Fly",
      "CHA-LA HEAD-CHA-LA": "CHA-LA HEAD-CHA-LA",
      "Cha": "CHA-LA HEAD-CHA-LA",
      "Peace Sign": "Peace Sign",
      "Asterisk": "*~Asterisk~",
      "Zankyou Sanka": "Zankyou Zanka",
      "Departure!": "departure!",
      "Odd Future": "ODD FUTURE",
      "Bloody Stream": "BLOODY STREAM",
      "Great Days": "Great Days",
      "Stand Proud": "STAND PROUD",
      "Fly High!!": "FLY HIGH",
      "99.9": "99.9",
      "Ready Steady Go": "READY STEADY GO",
      "Where Our Blue Is": "Ao no Sumika",
      "Brave": "Yuusha",
      "Work": "W●RK",
      "Utopia": "Kamihitoe",
      "Mirage": "Mirage",
      "Mephisto": "Mephisto",
      "Dream Lantern": "Yume Tourou",
      "I Will Give You a Romance": "Romance wo Ageru yo",
      "Anytime Anywhere": "Anytime Anywhere",
      "Comedy": "Kigeki",
      "Shock": "Shogeki",
      "Tougenkyou Alien": "Tougenkyou Alien",
      "History Maker": "History Maker",
      "Roundabout": "Roundabout",
      "Walk Like an Egyptian": "Walk Like an Egyptian",
      "I Want You": "I Want You",
      "Secret Base (Kimi ga Kureta Mono)": "secret base ~Kimi ga Kureta Mono~",
      "Kyomu Densen": "Kyoumu Densen",
      "O2": "02~O-Two~",
      "On The Way": "Kakumei Douchuu",
      "Platinum Disco": "Platinum Disco",
      "Sparkle": "Sparkle",
      "99": "99",
      "Heikousen": "Heikousen",
      "Seishun Kyousoukyoku": "Seishun Kyousoukyoku",
      "Sajou no Hana": "Sajou no Hana",
      "Let Me Hear": "Let Me Hear",
      "This Is It": "ReawakeR"
    };

    const targetSongNorm = normalize(overrides[pair.song] || pair.song);

    // 1. Check local DB first
    const regexAnime = new RegExp(cleanAnime.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    let themeMatch = await ThemeCache.findOne({
      $or: [
        { animeTitle: { $regex: regexAnime } },
        { animeTitleEnglish: { $regex: regexAnime } },
        { animeTitleAlternative: { $regex: regexAnime } }
      ],
      songTitle: new RegExp(pair.song.substring(0, 5).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    });

    if (themeMatch && (normalize(themeMatch.songTitle).includes(targetSongNorm) || targetSongNorm.includes(normalize(themeMatch.songTitle)))) {
      console.log(`[LOCAL] Found ${pair.song} in ${pair.anime}`);
      await ThemeCache.findByIdAndUpdate(themeMatch._id, {
        isPopular: true,
        popularRank: pair.rank,
        featuredAt: new Date()
      });
      continue;
    }

    // 2. Not in local DB, fetch from AnimeThemes
    console.log(`[REMOTE] Searching for ${pair.song} in ${pair.anime}...`);
    try {
      await delay(AT_DELAY_MS);
      const include = 'animethemes.animethemeentries.videos,images,studios,series,animethemes.song.artists';
      
      // Try searching by anime name first using q parameter
      let searchUrl = `https://api.animethemes.moe/anime?q=${encodeURIComponent(cleanAnime)}&page[size]=50&include=${include}`;
      let res = await fetch(searchUrl, { headers: { 'User-Agent': 'Kaikansen/1.0.0' } });
      let data = await res.json() as any;

      let bestTheme: any = null;

      if (data.anime && data.anime.length > 0) {
        for (const anime of data.anime) {
          const themes = anime.animethemes ?? [];
          for (const atTheme of themes) {
            const songTitleNorm = normalize(atTheme.song?.title || '');
            if (songTitleNorm.includes(targetSongNorm) || targetSongNorm.includes(songTitleNorm)) {
              atTheme.anime = anime;
              bestTheme = atTheme;
              break;
            }
          }
          if (bestTheme) break;
        }
      }

      // If no match found by anime name, try searching by song title directly
      if (!bestTheme) {
        await delay(AT_DELAY_MS);
        const songQuery = overrides[pair.song] || pair.song;
        const songUrl = `https://api.animethemes.moe/animetheme?q=${encodeURIComponent(songQuery)}&page[size]=50&include=anime.images,anime.studios,anime.series,animethemeentries.videos,song.artists`;
        const songRes = await fetch(songUrl, { headers: { 'User-Agent': 'Kaikansen/1.0.0' } });
        const songData = await songRes.json() as any;

        if (songData.animethemes && songData.animethemes.length > 0) {
          for (const st of songData.animethemes) {
            const animeName = st.anime?.name?.toLowerCase() || '';
            const animeEng = st.anime?.name_english?.toLowerCase() || '';
            const animeAlt = (st.anime?.name_alternatives || []).map((a: any) => a.name?.toLowerCase() || '');
            const targetAnime = cleanAnime.toLowerCase();
            
            if (animeName.includes(targetAnime) || targetAnime.includes(animeName) ||
                animeEng.includes(targetAnime) || targetAnime.includes(animeEng) ||
                animeAlt.some((a: string) => a.includes(targetAnime) || targetAnime.includes(a))) {
              bestTheme = st;
              break;
            }
          }
          
          if (!bestTheme && songData.animethemes.length === 1) {
             const st = songData.animethemes[0];
             const stNorm = normalize(st.song?.title || '');
             if (stNorm === targetSongNorm || stNorm.includes(targetSongNorm)) {
                bestTheme = st;
             }
          }
        }
      }

      if (bestTheme) {
        console.log(`[SEED] Found ${pair.song} on AT! Parsing...`);
        const parsed = parseATTheme(bestTheme);
        if (parsed) {
          const enriched = await enrichTheme(parsed, bestTheme.anime, {
            lastCompletedPage: 0,
            totalProcessed: 0,
            totalErrors: 0,
            nullAudioUrlCount: 0,
            anilistFallbacks: 0,
            kitsuFallbacks: 0,
            unknownCount: 0,
            startedAt: '',
            lastUpdatedAt: ''
          });

          await ThemeCache.findOneAndUpdate({ slug: enriched.slug }, {
            ...enriched,
            isPopular: true,
            popularRank: pair.rank,
            featuredAt: new Date()
          }, { upsert: true });
          console.log(`[SUCCESS] Seeded ${pair.song} for ${pair.anime}`);
        }
      } else {
        console.log(`[MISS] Song ${pair.song} not found in themes for ${cleanAnime}`);
      }

    } catch (err) {
      console.error(`[ERROR] Deep seed failed for ${pair.song}:`, err);
    }
  }

  process.exit(0);
}

deepSeed();
