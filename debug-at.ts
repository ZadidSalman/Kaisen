async function debugAT() {
  const id = 12838
  const include = 'anime,song.artists,animethemeentries.videos'
  const url = `https://api.animethemes.moe/animetheme/${id}?include=${include}`
  const res = await fetch(url, { headers: { 'User-Agent': 'Kaikansen/1.0.0' } })
  const data = await res.json()
  console.log(JSON.stringify(data, null, 2))
}
debugAT()
