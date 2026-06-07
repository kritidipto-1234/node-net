document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("status").textContent = "JS loaded ✓"

  document.getElementById("btn").addEventListener("click", async () => {
    const n = document.getElementById("numInput").value
    if (n === "") return

    const res = await fetch(`/double?n=${n}`)
    const { result } = await res.json()
    document.getElementById("result").textContent = `double of ${n} is ${result}`
  })

  document.getElementById("loadImgs").addEventListener("click", () => {
    const grid = document.getElementById("imgGrid")
    grid.innerHTML = ""
    for (let i = 1; i <= 30; i++) {
      const img = document.createElement("img")
      img.src = `/largeimg.jpg?${i}`
      img.style.width = "100%"
      grid.appendChild(img)
    }
  })
})
