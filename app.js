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
				if (battles <= 0) {
					return 0;
				}
				return kills / battles;
			});
		} else if (stat === "Damage/Battle") {
			const dmgMap =
				buildDeltaMap(history, "pvp.totalDmgDone");
			const battleMap =
				buildDeltaMap(history, "pvp.gamePlayed");
			values = labels.map(date => {
				const dmg =
					dmgMap.get(date) ?? 0;
				const battles =
					battleMap.get(date) ?? 0;
				if (battles <= 0)
					return 0;
				return dmg / battles;
			});
		} else if (stat === "Heal/Battle") {
			const healMap =
				buildDeltaMap(history, "pvp.totalHealingDone");
			const battleMap =
				buildDeltaMap(history, "pvp.gamePlayed");
			values = labels.map(date => {
				const heal =
					healMap.get(date) ?? 0;
				const battles =
					battleMap.get(date) ?? 0;
				if (battles <= 0)
					return 0;
				return heal / battles;
			});
		} else if (stat === "AverageDPS") {
			const dmgMap =
				buildDeltaMap(history, "pvp.totalDmgDone");
			const timeMap =
				buildDeltaMap(history, "pvp.totalBattleTime");
			values = labels.map(date => {
				const dmg =
					dmgMap.get(date) ?? 0;
				const time =
					timeMap.get(date) ?? 0;
				if (time <= 0)
					return 0;
				return dmg / ((time*60)/100);
			});
		} else if (stat === "D/Min") {
			const deathMap =
				buildDeltaMap(history, "pvp.totalDeath");
			const timeMap =
				buildDeltaMap(history, "pvp.totalBattleTime");
			values = labels.map(date => {
				const death =
					deathMap.get(date) ?? 0;
				const time =
					timeMap.get(date) ?? 0;
				if (time <= 0)
					return 0;
				return death / (time/100);
			});
		} else if (stat === "K/D") {
			const killMap =
				buildDeltaMap(history, "pvp.totalKill");
			const deathMap =
				buildDeltaMap(history, "pvp.totalDeath");
			values = labels.map(date => {
				const kill =
					killMap.get(date) ?? 0;
				const death =
					deathMap.get(date) ?? 0;
				if (death <= 0)
					return kill;
				return kill / death;
			});
		} else if (stat === "K+A/D") {
			const killMap =
				buildDeltaMap(history, "pvp.totalKill");
			const assistMap =
				buildDeltaMap(history, "pvp.totalAssists");
			const deathMap =
				buildDeltaMap(history, "pvp.totalDeath");
			values = labels.map(date => {
				const kill =
					killMap.get(date) ?? 0;
				const assist =
					assistMap.get(date) ?? 0;
				const death =
					deathMap.get(date) ?? 0;
				if (death <= 0)
					return (kill+assist);
				return (kill+assist) / death;
			});
		} else if (stat === "K/Min") {
			const killMap =
				buildDeltaMap(history, "pvp.totalKill");
			const timeMap =
				buildDeltaMap(history, "pvp.totalBattleTime");
			values = labels.map(date => {
				const kill =
					killMap.get(date) ?? 0;
				const time =
					timeMap.get(date) ?? 0;
				if (time <= 0)
					return 0;
				return kill / (time/100);
			});
		} else if (stat === "K+A/Min") {
			const killMap =
				buildDeltaMap(history, "pvp.totalKill");
			const assistMap =
				buildDeltaMap(history, "pvp.totalAssists");
			const timeMap =
				buildDeltaMap(history, "pvp.totalBattleTime");
			values = labels.map(date => {
				const kill =
					killMap.get(date) ?? 0;
				const assist =
					assistMap.get(date) ?? 0;
				const time =
					timeMap.get(date) ?? 0;
				if (time <= 0)
					return 0;
				return (kill+assist) / (time/100);
			});
		} else if (stat === "H/Min") {
			const healMap =
				buildDeltaMap(history, "pvp.totalHealingDone");
			const timeMap =
				buildDeltaMap(history, "pvp.totalBattleTime");
			values = labels.map(date => {
				const heal =
					healMap.get(date) ?? 0;
				const time =
					timeMap.get(date) ?? 0;
				if (time <= 0)
					return 0;
				return heal / (time/100);
			});
		} else if (stat === "Win/Loss") {
			const winMap =
				buildDeltaMap(history, "pvp.gameWin");
			const playedMap =
				buildDeltaMap(history, "pvp.gamePlayed");
			values = labels.map(date => {
				const win =
					winMap.get(date) ?? 0;
				const played =
					playedMap.get(date) ?? 0;
				if (played <= 0)
					return 0;
				if (played == win)
					return played;
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
