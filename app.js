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
    // Load all player histories
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

    // -----------------------------------------
    // Build unified timeline across all players
    // -----------------------------------------
    const allDatesSet = new Set();

    for (const { history } of playerDataList) {
        Object.keys(history).forEach(d => allDatesSet.add(d));
    }

    const labels = Array.from(allDatesSet).sort();

    // -----------------------------------------
    // Build datasets with correct delta logic
    // -----------------------------------------
    const datasets = [];

    for (const { player, history } of playerDataList) {

        let lastKnownValue = null;

        const values = [];

        for (const date of labels) {
            const entry = history[date];

            let delta = 0;

            if (entry && entry.Flat && entry.Flat[stat] != null) {
                const currentValue = parseFloat(entry.Flat[stat]) || 0;

                // Only compute delta from a REAL previous snapshot
                if (lastKnownValue !== null) {
                    delta = currentValue - lastKnownValue;
                } else {
                    // First ever snapshot -> no baseline comparison
                    delta = 0;
                }

                lastKnownValue = currentValue;
            } else {
                // No snapshot on this day:
                // Do NOT compare to zero, do nothing
                delta = 0;
            }

            values.push(delta);
        }

        datasets.push({
            label: player.latestName,
            data: values
        });
    }

    // -----------------------------
    // Render chart
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
