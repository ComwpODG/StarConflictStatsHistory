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

		const killMap =
			buildDeltaMap(history, "pvp.totalKill");
		const assistMap =
			buildDeltaMap(history, "pvp.totalAssists");
		const battleMap =
			buildDeltaMap(history, "pvp.gamePlayed");
		const dmgMap =
			buildDeltaMap(history, "pvp.totalDmgDone");
		const healMap =
			buildDeltaMap(history, "pvp.totalHealingDone");
		const timeMap =
			buildDeltaMap(history, "pvp.totalBattleTime");
		const deathMap =
			buildDeltaMap(history, "pvp.totalDeath");
		const winMap =
			buildDeltaMap(history, "pvp.gameWin");

		//Per Battle Averages
		if (stat === "Kills/Battle") {
			values = labels.map(date => {
				const kills = killMap.get(date) ?? 0;
				const battles = battleMap.get(date) ?? 0;
				if (battles <= 0) {
					return 0;
				}
				return kills / battles;
			});
		} else if (stat === "Assists/Battle") {
			values = labels.map(date => {
				const assists = assistMap.get(date) ?? 0;
				const battles = battleMap.get(date) ?? 0;
				if (battles <= 0) {
					return 0;
				}
				return assists / battles;
			});
		} else if (stat === "Kills+Assists/Battle") {
			values = labels.map(date => {
				const kills = killMap.get(date) ?? 0;
				const assists = assistMap.get(date) ?? 0;
				const battles = battleMap.get(date) ?? 0;
				if (battles <= 0) {
					return 0;
				}
				return (kills+assists) / battles;
			});
		} else if (stat === "Damage/Battle") {
			values = labels.map(date => {
				const dmg = dmgMap.get(date) ?? 0;
				const battles = battleMap.get(date) ?? 0;
				if (battles <= 0) {
					return 0;
				}
				return dmg / battles;
			});
		} else if (stat === "Heal/Battle") {
			values = labels.map(date => {
				const heal = healMap.get(date) ?? 0;
				const battles = battleMap.get(date) ?? 0;
				if (battles <= 0) {
					return 0;
				}
				return heal / battles;
			});
		} else if (stat === "Death/Battle") {
			values = labels.map(date => {
				const death = deathMap.get(date) ?? 0;
				const battles = battleMap.get(date) ?? 0;
				if (battles <= 0) {
					return 0;
				}
				return death / battles;
			});
		} else if (stat === "Time/Battle") {
			values = labels.map(date => {
				const time = timeMap.get(date) ?? 0;
				const battles = battleMap.get(date) ?? 0;
				if (battles <= 0) {
					return 0;
				}
				return time / battles;
			});
			
		//Minute-by-Minute
		} else if (stat === "Kills/Min") {
			values = labels.map(date => {
				const kill = killMap.get(date) ?? 0;
				const time = timeMap.get(date) ?? 0;
				if (time <= 0) {
					return 0;
				}
				return kill / (time/10000);
			});
		} else if (stat === "Assists/Min") {
			values = labels.map(date => {
				const assists = assistMap.get(date) ?? 0;
				const time = timeMap.get(date) ?? 0;
				if (time <= 0) {
					return 0;
				}
				return assists / (time/10000);
			});
		} else if (stat === "Kills+Assists/Min") {
			values = labels.map(date => {
				const kill = killMap.get(date) ?? 0;
				const assists = assistMap.get(date) ?? 0;
				const time = timeMap.get(date) ?? 0;
				if (time <= 0) {
					return 0;
				}
				return (kill+assists) / (time/10000);
			});
		} else if (stat === "Damage/Min") {
			values = labels.map(date => {
				const damage = dmgMap.get(date) ?? 0;
				const time = timeMap.get(date) ?? 0;
				if (time <= 0) {
					return 0;
				}
				return damage / (time/10000);
			});
		} else if (stat === "Heal/Min") {
			values = labels.map(date => {
				const heal = healMap.get(date) ?? 0;
				const time = timeMap.get(date) ?? 0;
				if (time <= 0) {
					return 0;
				}
				return heal / (time/10000);
			});
		} else if (stat === "Death/Min") {
			values = labels.map(date => {
				const death = deathMap.get(date) ?? 0;
				const time = timeMap.get(date) ?? 0;
				if (time <= 0) {
					return 0;
				}
				return death / (time/10000);
			});
		
		//Competitive
		} else if (stat === "K/D") {
			values = labels.map(date => {
				const kill = killMap.get(date) ?? 0;
				const death = deathMap.get(date) ?? 0;
				if (death <= 0) {
					return kill;
				}
				return kill / death;
			});
		} else if (stat === "K+A/D") {
			values = labels.map(date => {
				const kill = killMap.get(date) ?? 0;
				const assist = assistMap.get(date) ?? 0;
				const death = deathMap.get(date) ?? 0;
				if (death <= 0) {
					return (kill+assist);
				}
				return (kill+assist) / death;
			});
		
		// Random Other Calculated
		} else if (stat === "Win/Loss") {
			values = labels.map(date => {
				const win = winMap.get(date) ?? 0;
				const played = battleMap.get(date) ?? 0;
				if (played <= 0) {
					return 0;
				}
				if (played == win) {
					return played;
				}
				return win / (played-win);
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
