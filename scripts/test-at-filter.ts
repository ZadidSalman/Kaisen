async function testATFilter() {
  const title = 'Shingeki no Kyojin'
  const include = 'animethemes.animethemeentries.videos,images,studios,series,animethemes.song.artists'
  const url = `https://api.animethemes.moe/anime?page[size]=100&page[number]=1&filter[name]=${encodeURIComponent(title)}&include=${include}`
  console.log(`URL: ${url}`)
  const res = await fetch(url, { headers: { 'User-Agent': 'Kaikansen/1.0.0' } })
  console.log(`Status: ${res.status}`)
  if (!res.ok) {
    const error = await res.json()
    console.log(`Error: ${JSON.stringify(error, null, 2)}`)
  } else {
    const data = await res.json()
    console.log(`Success! Found ${data.anime.length} anime.`)
  }
}

testATFilter()
