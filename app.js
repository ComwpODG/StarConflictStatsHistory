let playerIndex = null;
let selectedPlayers = [];
let chart = null;

init();

async function init() {
    const response = await fetch("UID Summations/index.json");
    playerIndex = await response.json();

    const datalist = document.getElementById("players");

    playerIndex.players.forEach(player => {
        const option = document.createElement("option");
        option.value = player.latestName;
        datalist.appendChild(option);
    });
}

document.getElementById("addPlayerBtn").onclick = addPlayer;
document.getElementById("generateBtn").onclick = generateGraph;

function addPlayer() {
    const input = document.getElementById("playerInput");
    const name = input.value.trim();

    if (!name) return;

    const player = playerIndex.players.find(
        p => p.latestName.toLowerCase() === name.toLowerCase()
    );

    if (!player) return;

    if (selectedPlayers.some(p => p.uid === player.uid)) return;

    selectedPlayers.push(player);

    renderSelectedPlayers();
    input.value = "";
}

function renderSelectedPlayers() {
    const div = document.getElementById("selectedPlayers");
    div.innerHTML = "";

    selectedPlayers.forEach(player => {
        const chip = document.createElement("span");
        chip.className = "player-chip";
        chip.textContent = player.latestName;
        div.appendChild(chip);
    });
}

async function generateGraph() {
    const stat = document.getElementById("statSelect").value;

    if (!selectedPlayers.length) return;

    // -----------------------------
    // 1. Load all player data first
    // -----------------------------
    const playerDataList = [];

    for (const player of selectedPlayers) {
        const res = await fetch(`UID Summations/${player.uid}.json`);
        const data = await res.json();
        playerDataList.push({
            player,
            history: data.history
        });
    }

    // ----------------------------------------
    // 2. Build a unified sorted date timeline
    // ----------------------------------------
    const allDatesSet = new Set();

    for (const { history } of playerDataList) {
        Object.keys(history).forEach(d => allDatesSet.add(d));
    }

    const labels = Array.from(allDatesSet).sort();

    // ----------------------------------------
    // 3. Build datasets with forward-fill + delta
    // ----------------------------------------
    const datasets = [];

    for (const { player, history } of playerDataList) {
        let previousValue = 0;

        const values = [];

        for (let i = 0; i < labels.length; i++) {
            const date = labels[i];

            const entry = history[date];

            let currentValue = previousValue;

            if (entry && entry.Flat && entry.Flat[stat] != null) {
                currentValue = parseFloat(entry.Flat[stat]) || 0;
            }

            // delta from previous day
            const delta = currentValue - previousValue;

            values.push(delta);

            // update carry-forward value
            previousValue = currentValue;
        }

        datasets.push({
            label: player.latestName,
            data: values
        });
    }

    // -----------------------------
    // 4. Render chart
    // -----------------------------
    if (chart) chart.destroy();

    chart = new Chart(
        document.getElementById("chart"),
        {
            type: "line",
            data: {
                labels,
                datasets
            }
        }
    );
}
