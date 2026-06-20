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

function buildDeltaMap(history, statName) {
    const snapshotDates = Object.keys(history)
        .filter(d => history[d]?.Flat && history[d].Flat[statName] != null)
        .sort();

    const deltaMap = new Map();

    let previousValue = null;

    for (const date of snapshotDates) {
        const currentValue =
            parseFloat(history[date].Flat[statName]) || 0;

        if (previousValue === null) {
            deltaMap.set(date, 0);
        } else {
            deltaMap.set(date, currentValue - previousValue);
        }

        previousValue = currentValue;
    }

    return deltaMap;
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
            history: data.history || {}
        });
    }

    // -------------------------------------------------------
    // Build unified timeline across all players (labels axis)
    // -------------------------------------------------------
    const allDatesSet = new Set();

    for (const { history } of playerDataList) {
        Object.keys(history).forEach(d => allDatesSet.add(d));
    }

    const labels = Array.from(allDatesSet).sort();

    // -------------------------------------------------------
    // Build datasets using snapshot-to-snapshot deltas ONLY
    // -------------------------------------------------------
    const datasets = [];

    for (const { player, history } of playerDataList) {

        // Extract only valid snapshot dates for this player
        const snapshotDates = Object.keys(history)
            .filter(d => history[d]?.Flat && history[d].Flat[stat] != null)
            .sort();

        // Build delta map: date -> delta since previous snapshot
        let values;

		if (stat === "Kills/Battle") {
			
			const killMap =
				buildDeltaMap(history, "pvp.totalKill");

			const battleMap =
				buildDeltaMap(history, "pvp.gamePlayed");

			values = labels.map(date => {

				const kills =
					killMap.get(date) ?? 0;

				const battles =
					battleMap.get(date) ?? 0;

				if (battles <= 0)
					return 0;

				return kills / battles;
			});

		} else {

			const deltaMap = buildDeltaMap(history, stat);

			values = labels.map(date =>
				deltaMap.get(date) ?? 0
			);
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
            },
            options: {
                spanGaps: false
            }
        }
    );
}
