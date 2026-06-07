document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("status").textContent = "JS loaded ✓"

  document.getElementById("btn").addEventListener("click", async () => {
    const n = document.getElementById("numInput").value
    if (n === "") return

    const res = await fetch(`/double?n=${n}`)
    const { result } = await res.json()
    document.getElementById("result").textContent = `double of ${n} is ${result}`
  })
})
