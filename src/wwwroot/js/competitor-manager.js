const CompetitorManager = {
    sortableA: null,
    sortableB: null,

    init() {
        const commonOptions = {
            group: 'competitors',
            animation: 150,
            ghostClass: 'bg-primary/20',
            onEnd: () => this.syncOrderToServer()
        };

        this.sortableA = new Sortable(document.getElementById('listA'), commonOptions);
        this.sortableB = new Sortable(document.getElementById('listB'), commonOptions);

        this.setupValidationListeners();
    },

    async syncOrderToServer() {
        const leftIds = Array.from(document.getElementById('listA').children).map(el => el.dataset.id);
        const rightIds = Array.from(document.getElementById('listB').children).map(el => el.dataset.id);

        state.round.leftGroupWcaIds = leftIds;
        state.round.rightGroupWcaIds = rightIds;

        this.renderList(state.competitors);

        await submit();
    },

    setupValidationListeners() {
        ["modal_wcaid", "modal_name", "modal_country"].forEach(id => {
            document.getElementById(id).addEventListener("input", () => this.validateForm());
        });
    },

    renderList(competitors) {
        const listA = document.getElementById("listA");
        const listB = document.getElementById("listB");
        const btnContainer = document.getElementById("setButtonsContainer");

        listA.innerHTML = "";
        listB.innerHTML = "";
        btnContainer.innerHTML = "";

        // Create a lookup map for speed
        const compMap = new Map(competitors.map(c => [c.wcaId, c]));

        state.round.leftGroupWcaIds.forEach(id => {
            const c = compMap.get(id);
            if (c) {
                listA.appendChild(this.createCard(c));
                compMap.delete(id);
            }
        });

        state.round.rightGroupWcaIds.forEach(id => {
            const c = compMap.get(id);
            if (c) {
                listB.appendChild(this.createCard(c));
                compMap.delete(id);
            }
        });

        // If someone is in the 'competitors' list but NOT in either 
        // Group array(e.g.newly added), put them in List A.
        compMap.forEach(c => {
            listA.appendChild(this.createCard(c));
            state.round.leftGroupWcaIds.push(c.wcaId);
        });

        const matchCount = Math.min(state.round.leftGroupWcaIds.length, state.round.rightGroupWcaIds.length);

        for (let i = 0; i < matchCount; i++) {
            const btn = document.createElement("button");
            // h-[50px] roughly matches the height of a competitor card
            btn.className = "btn btn-square btn-outline btn-accent btn-sm h-[50px] w-12 shadow-sm";
            btn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" />
                    <path fill-rule="evenodd" d="M10.707 3.293a1 1 0 010 1.414L7.414 8H15a1 1 0 110 2H7.414l3.293 3.293a1 1 0 01-1.414 1.414l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 0z" clip-rule="evenodd" />
                    <path fill-rule="evenodd" d="M9.293 16.707a1 1 0 010-1.414L12.586 12H5a1 1 0 110-2h7.586l-3.293-3.293a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                </svg>
                <span class="text-[10px] block font-black">SET</span>
            `;

            const leftId = state.round.leftGroupWcaIds[i];
            const rightId = state.round.rightGroupWcaIds[i];

            btn.onclick = () => this.setMatchup(leftId, rightId);
            btnContainer.appendChild(btn);
        }
    },

    async setMatchup(leftWcaId, rightWcaId) {
        state.round.leftCompetitorWcaId = leftWcaId;
        state.round.rightCompetitorWcaId = rightWcaId;

        renderCompetitors();
        selectCompetitor("left", state.round.leftCompetitorWcaId);
        selectCompetitor("right", state.round.rightCompetitorWcaId);

        await submit();

        // Optional: Scroll down to the Matchup section so user sees the change
        document.querySelector('h2.text-xl.font-bold').scrollIntoView({ behavior: 'smooth' });
    },

    createCard(c) {
        const div = document.createElement("div");
        // Added 'group' class to handle hover effects for the buttons
        div.className = "group bg-base-100 p-3 rounded-lg border border-base-300 shadow-sm flex justify-between items-center cursor-move hover:border-primary transition-colors";
        div.dataset.id = c.wcaId;

        // Escape the name to prevent syntax errors in the onclick handler if name has an apostrophe
        const safeName = c.name.replace(/'/g, "\\'");
        const flagCode = c.country.toLowerCase();

        div.innerHTML = `
        <div class="flex items-center gap-3">
            <div class="flex-shrink-0 w-8 h-5 overflow-hidden flex items-center justify-center">
                <img 
                    src="https://flagcdn.com/h60/${flagCode}.png" 
                    alt="${c.country}" 
                    class="max-w-full max-h-full object-contain"
                    onerror="this.style.display='none'; this.parentElement.classList.add('flag-error');"
                />
            </div>
            <div class="font-bold text-sm leading-tight truncate max-w-[150px]">${c.name}</div>
        </div>
        
        <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onclick="CompetitorManager.openEdit('${c.wcaId}')" class="btn btn-ghost btn-xs text-info" title="Edit">
                Edit
            </button>
            <button onclick="CompetitorManager.confirmDelete('${c.wcaId}', '${safeName}')" class="btn btn-ghost btn-xs text-error" title="Delete">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            </button>
        </div>
    `;
        return div;
    },

    async swapGroups() {
        const temp = state.round.leftGroupWcaIds;
        state.round.leftGroupWcaIds = state.round.rightGroupWcaIds;
        state.round.rightGroupWcaIds = temp;

        this.renderList(state.competitors);

        await submit();
    },

    async confirmDelete(wcaId, name) {
        const confirmed = confirm(`Are you sure you want to permanently delete ${name}?`);

        if (confirmed) {
            try {
                const response = await fetch(`/api/competitor/${wcaId}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    const updatedState = await response.json();
                    state = updatedState;
                    render();
                } else {
                    alert("Error deleting competitor.");
                }
            } catch (err) {
                console.error("Delete failed:", err);
                alert("Network error while deleting.");
            }
        }
    },

    openAdd() {
        document.getElementById("competitor_form").reset();
        document.getElementById("modal_wcaid").value = "";
        document.getElementById("modal_wcaid").disabled = false;
        document.getElementById("id_help_text").style.opacity = "0";
        document.getElementById("modal_name").value = "";
        document.getElementById("modal_country").value = "";
        document.getElementById("saveCompBtn").textContent = "Add Competitor";

        this.validateForm();

        document.getElementById("competitor_modal").showModal();
    },

    openEdit(wcaId) {
        const c = state.competitors.find(comp => comp.wcaId === wcaId);
        if (!c) return;

        document.getElementById("modal_wcaid").value = c.wcaId;
        document.getElementById("modal_wcaid").disabled = true;
        document.getElementById("modal_name").value = c.name;
        document.getElementById("modal_country").value = c.country;
        document.getElementById("saveCompBtn").textContent = "Update Competitor";

        this.validateForm();
        document.getElementById("competitor_modal").showModal();
    },

    validateForm() {
        const wcaIdInput = document.getElementById("modal_wcaid");
        const wcaId = wcaIdInput.value.trim();
        const name = document.getElementById("modal_name").value.trim();
        const country = document.getElementById("modal_country").value.trim();
        const saveBtn = document.getElementById("saveCompBtn");
        const helpText = document.getElementById("id_help_text");

        // Check if the input is disabled (this means we are in EDIT mode)
        const isEditMode = wcaIdInput.disabled;

        // Only run duplicate logic if we are NOT in edit mode
        const isDuplicate = !isEditMode && state.competitors.some(c =>
            c.wcaId.toLowerCase() === wcaId.toLowerCase()
        );

        if (isDuplicate && wcaId !== "") {
            // "New" entry that conflicts with an existing ID
            wcaIdInput.classList.add("input-warning");
            wcaIdInput.classList.remove("input-accent");
            saveBtn.classList.add("btn-warning");
            saveBtn.classList.remove("btn-accent");
            saveBtn.textContent = "Update Competitor";
            helpText.style.opacity = "1";
        } else {
            // Normal "New" entry OR "Edit" mode
            wcaIdInput.classList.remove("input-warning");
            wcaIdInput.classList.add("input-accent");
            saveBtn.classList.add("btn-accent");
            saveBtn.classList.remove("btn-warning");
            saveBtn.textContent = isEditMode ? "Update Competitor" : "Add Competitor";
            helpText.style.opacity = "0";
        }

        const fieldsFilled = wcaId && name && country;
        saveBtn.disabled = isEditMode ? !fieldsFilled : (!fieldsFilled || isDuplicate);
    }
};

function openCompetitorModal() {
    document.getElementById("modal_wcaid").value = "";
    document.getElementById("modal_wcaid").disabled = false;
    document.getElementById("id_help_text").style.opacity = "0";
    document.getElementById("modal_name").value = "";
    document.getElementById("modal_country").value = "";
    document.getElementById("modal_pb_single").value = "";
    document.getElementById("modal_pb_average").value = "";

    CompetitorManager.validateForm();

    document.getElementById("competitor_modal").showModal();
}
