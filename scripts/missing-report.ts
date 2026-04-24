import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

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

async function missingReport() {
  const uri = process.env.MONGODB_URI || '';
  await mongoose.connect(uri, { dbName: 'kaikansen' });
  const ThemeCache = mongoose.models.ThemeCache || mongoose.model('ThemeCache', new mongoose.Schema({ isPopular: Boolean }, { strict: false }));
  
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

  const missing = [];
  for (const pair of pairs) {
     const exists = await ThemeCache.findOne({ 
       popularRank: pair.rank,
       isPopular: true
     });
     if (!exists) {
       missing.push(pair);
     }
  }

  console.log("Missing pairs count:", missing.length);
  console.log(JSON.stringify(missing, null, 2));
  process.exit(0);
}

missingReport().catch(console.error);
