let playerIndex = null;

let selectedPlayers = [];

let chart = null;

init();

async function init() {

    const response =
        await fetch("UID Summations/index.json");

    playerIndex =
        await response.json();

    const datalist =
        document.getElementById("players");

    playerIndex.players.forEach(player => {

        const option =
            document.createElement("option");

        option.value =
            player.latestName;

        datalist.appendChild(option);
    });
}

document
    .getElementById("addPlayerBtn")
    .onclick = addPlayer;

document
    .getElementById("generateBtn")
    .onclick = generateGraph;

function addPlayer() {

    const input =
        document.getElementById("playerInput");

    const name =
        input.value.trim();

    if (!name)
        return;

    const player =
        playerIndex.players.find(
            p =>
                p.latestName.toLowerCase() ===
                name.toLowerCase()
        );

    if (!player)
        return;

    if (
        selectedPlayers.some(
            p => p.uid === player.uid
        )
    )
        return;

    selectedPlayers.push(player);

    renderSelectedPlayers();

    input.value = "";
}

function renderSelectedPlayers() {

    const div =
        document.getElementById(
            "selectedPlayers"
        );

    div.innerHTML = "";

    selectedPlayers.forEach(player => {

        const chip =
            document.createElement("span");

        chip.className =
            "player-chip";

        chip.textContent =
            player.latestName;

        div.appendChild(chip);
    });
}

async function generateGraph() {

    const stat =
        document.getElementById(
            "statSelect"
        ).value;

    const datasets = [];

    for (const player of selectedPlayers) {

        const response =
            await fetch(
                `UID Summations/${player.uid}.json`
            );

        const playerData =
            await response.json();

        const history =
            playerData.history;

        const dates =
            Object.keys(history).sort();

        const values = [];

        for (let i = 1; i < dates.length; i++) {

            const today =
                history[dates[i]];

            const yesterday =
                history[dates[i - 1]];

            const current =
                parseFloat(
                    today.Flat[stat] || 0
                );

            const previous =
                parseFloat(
                    yesterday.Flat[stat] || 0
                );

            values.push(
                current - previous
            );
        }

        datasets.push({

            label:
                player.latestName,

            data:
                values
        });
    }

    const labels =
        selectedPlayers.length
            ? Object.keys(
                (
                    await (
                        await fetch(
                            `UID Summations/${selectedPlayers[0].uid}.json`
                        )
                    ).json()
                ).history
            ).slice(1)
            : [];

    if (chart)
        chart.destroy();

    chart = new Chart(

        document
            .getElementById("chart"),

        {
            type: "line",

            data: {
                labels,
                datasets
            }
        }
    );
}
