let providers = [];

let adminMap = null;
let adminMarker = null;

let editMap = null;
let editMarker = null;

let editingProviderId = null;


// ========================================
// PAGE START
// ========================================

document.addEventListener("DOMContentLoaded", function () {

    console.log("KKR Seva Admin JS loaded");


    // ========================================
    // LOGIN
    // ========================================

    const loginForm = document.getElementById("loginForm");

    if (loginForm) {

        loginForm.addEventListener("submit", async function (e) {

            e.preventDefault();

            const passwordInput =
                document.getElementById("loginPassword");

            const error =
                document.getElementById("loginError");

            const password = passwordInput.value;


            try {

                const response = await fetch("/api/login", {

                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        password: password
                    })

                });


                const data = await response.json();


                if (!response.ok) {

                    error.textContent =
                        data.error || "Login failed";

                    return;
                }


                error.textContent = "";

                showDashboard();

            }

            catch (err) {

                console.error("Login error:", err);

                error.textContent =
                    "Server error. Make sure the server is running.";

            }

        });

    }


    // ========================================
    // LOGOUT
    // ========================================

    const logoutBtn =
        document.getElementById("logoutBtn");


    if (logoutBtn) {

        logoutBtn.addEventListener("click", async function () {

            try {

                await fetch("/api/logout", {
                    method: "POST"
                });

            }

            catch (err) {

                console.error(err);

            }


            location.reload();

        });

    }


    // ========================================
    // ADD PROVIDER
    // ========================================

    const adminForm =
        document.getElementById("adminForm");


    if (adminForm) {

        adminForm.addEventListener("submit", async function (e) {

            e.preventDefault();


            const provider = {

                name:
                    document.getElementById("adminName").value.trim(),

                service:
                    document.getElementById("adminService").value,

                area:
                    document.getElementById("adminArea").value,

                phone:
                    document.getElementById("adminPhone").value.trim(),

                hours:
                    document.getElementById("adminHours").value.trim(),

                verified:
                    document.getElementById("adminVerified").checked,

                latitude:
                    document.getElementById("selectedLatitude").textContent,

                longitude:
                    document.getElementById("selectedLongitude").textContent

            };


            if (
                provider.latitude === "Not selected" ||
                provider.longitude === "Not selected"
            ) {

                provider.latitude = null;
                provider.longitude = null;

            }


            try {

                const response = await fetch("/api/providers", {

                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify(provider)

                });


                const data = await response.json();


                if (!response.ok) {

                    alert(data.error || "Could not add provider");

                    return;
                }


                alert("Provider added successfully!");


                adminForm.reset();


                document.getElementById(
                    "selectedLatitude"
                ).textContent = "Not selected";


                document.getElementById(
                    "selectedLongitude"
                ).textContent = "Not selected";


                if (adminMarker) {

                    adminMap.removeLayer(adminMarker);

                    adminMarker = null;

                }


                loadProviders();

                loadStats();

            }

            catch (err) {

                console.error(err);

                alert("Server error.");

            }

        });

    }


    // ========================================
    // CLOSE EDIT MODAL
    // ========================================

    const closeEdit =
        document.getElementById("closeEdit");


    if (closeEdit) {

        closeEdit.addEventListener("click", closeEditModal);

    }


    // ========================================
    // EDIT FORM
    // ========================================

    const editForm =
        document.getElementById("editForm");


    if (editForm) {

        editForm.addEventListener("submit", saveProvider);

    }


    // ========================================
    // CHECK LOGIN
    // ========================================

    checkLogin();

});


// ========================================
// CHECK LOGIN
// ========================================

async function checkLogin() {

    try {

        const response =
            await fetch("/api/me");

        const data =
            await response.json();


        if (data.loggedIn) {

            showDashboard();

        }

    }

    catch (err) {

        console.error(
            "Could not check login:",
            err
        );

    }

}


// ========================================
// SHOW DASHBOARD
// ========================================

function showDashboard() {

    const loginSection =
        document.getElementById("loginSection");

    const adminSection =
        document.getElementById("adminSection");


    if (!loginSection || !adminSection) {

        console.error(
            "Dashboard elements not found"
        );

        return;

    }


    loginSection.classList.add("logged-in");

    adminSection.style.display = "block";


    setTimeout(function () {

        initializeAdminMap();

        loadProviders();

        loadStats();

    }, 500);

}


// ========================================
// ADMIN MAP
// ========================================

function initializeAdminMap() {

    const mapElement =
        document.getElementById("adminMap");


    if (!mapElement) {

        console.error(
            "Admin map element not found"
        );

        return;

    }


    if (typeof L === "undefined") {

        console.error(
            "Leaflet is not loaded"
        );

        return;

    }


    if (!adminMap) {

        adminMap = L.map("adminMap").setView(
            [29.9695, 76.8783],
            12
        );


        // Working tile provider

        L.tileLayer(
            "https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png",
            {
                attribution:
                    "&copy; OpenStreetMap contributors"
            }
        ).addTo(adminMap);


        // Click map to select location

        adminMap.on("click", function (e) {

            const lat =
                e.latlng.lat.toFixed(6);

            const lng =
                e.latlng.lng.toFixed(6);


            setAdminLocation(
                lat,
                lng
            );

        });

    }


    setTimeout(function () {

        if (adminMap) {

            adminMap.invalidateSize();

        }

    }, 300);

}


// ========================================
// SET ADMIN LOCATION
// ========================================

function setAdminLocation(lat, lng) {

    document.getElementById(
        "selectedLatitude"
    ).textContent = lat;


    document.getElementById(
        "selectedLongitude"
    ).textContent = lng;


    if (adminMarker) {

        adminMap.removeLayer(adminMarker);

    }


    adminMarker =
        L.marker([lat, lng]).addTo(adminMap);


    adminMarker.bindPopup(
        "Selected Provider Location"
    ).openPopup();

}


// ========================================
// LOAD PROVIDERS
// ========================================

async function loadProviders() {

    try {

        const response =
            await fetch("/api/providers");


        const data =
            await response.json();


        providers = data;


        renderProviders();

    }

    catch (err) {

        console.error(
            "Provider loading error:",
            err
        );

    }

}


// ========================================
// RENDER PROVIDERS
// ========================================

function renderProviders() {

    const container =
        document.getElementById("adminProviders");


    if (!container) return;


    container.innerHTML = "";


    if (!providers.length) {

        container.innerHTML = `
            <div class="empty-chart">
                No providers found.
            </div>
        `;

        return;

    }


    providers.forEach(function (provider) {

        const card =
            document.createElement("div");


        card.className =
            "admin-provider-card";


        const rating =
            Number(provider.average_rating || 0);


        const reviewCount =
            Number(provider.review_count || 0);


        const verifiedHTML =
            provider.verified

                ? `
                    <span class="admin-verified">
                        ✓ Verified
                    </span>
                  `

                : `
                    <span class="admin-not-verified">
                        Not Verified
                    </span>
                  `;


        card.innerHTML = `

            <div class="admin-provider-top">

                <div>

                    <h3 class="admin-provider-name">
                        ${escapeHTML(provider.name)}
                    </h3>

                    <div class="admin-provider-service">
                        ${escapeHTML(provider.service)}
                    </div>

                </div>

                ${verifiedHTML}

            </div>


            <div class="admin-provider-info">

                <div>
                    📍
                    <span>
                        ${escapeHTML(provider.area)}
                    </span>
                </div>


                <div>
                    📞
                    <span>
                        ${escapeHTML(provider.phone)}
                    </span>
                </div>


                <div>
                    🕐
                    <span>
                        ${escapeHTML(provider.hours)}
                    </span>
                </div>

            </div>


            <div class="admin-provider-rating">

                ⭐ ${rating.toFixed(1)}

                <span>
                    • ${reviewCount} review${reviewCount === 1 ? "" : "s"}
                </span>

            </div>


            <div class="admin-provider-actions">

                <button
                    class="admin-edit-btn"
                    onclick="editProvider(${provider.id})"
                >
                    ✏️ Edit
                </button>


                <button
                    class="admin-delete-btn"
                    onclick="deleteProvider(${provider.id})"
                >
                    🗑️ Delete
                </button>

            </div>

        `;


        container.appendChild(card);

    });

}


// ========================================
// EDIT PROVIDER
// ========================================

function editProvider(id) {

    const provider =
        providers.find(function (p) {

            return Number(p.id) === Number(id);

        });


    if (!provider) {

        alert("Provider not found.");

        return;

    }


    editingProviderId = id;


    document.getElementById(
        "editName"
    ).value = provider.name || "";


    document.getElementById(
        "editService"
    ).value = provider.service || "";


    document.getElementById(
        "editArea"
    ).value = provider.area || "";


    document.getElementById(
        "editPhone"
    ).value = provider.phone || "";


    document.getElementById(
        "editHours"
    ).value = provider.hours || "";


    document.getElementById(
        "editVerified"
    ).checked = Boolean(provider.verified);


    document.getElementById(
        "editLatitude"
    ).textContent =
        provider.latitude ??
        "Not selected";


    document.getElementById(
        "editLongitude"
    ).textContent =
        provider.longitude ??
        "Not selected";


    const modal =
        document.getElementById("editModal");


    modal.style.display = "flex";


    setTimeout(function () {

        initializeEditMap(provider);

    }, 200);

}


// ========================================
// EDIT MAP
// ========================================

function initializeEditMap(provider) {

    const mapElement =
        document.getElementById("editMap");


    if (!mapElement) return;


    if (typeof L === "undefined") return;


    const lat =
        Number(provider.latitude) || 29.9695;


    const lng =
        Number(provider.longitude) || 76.8783;


    if (!editMap) {

        editMap =
            L.map("editMap").setView(
                [lat, lng],
                13
            );


        L.tileLayer(
            "https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png",
            {
                attribution:
                    "&copy; OpenStreetMap contributors"
            }
        ).addTo(editMap);


        editMap.on("click", function (e) {

            const newLat =
                e.latlng.lat.toFixed(6);


            const newLng =
                e.latlng.lng.toFixed(6);


            setEditLocation(
                newLat,
                newLng
            );

        });

    }

    else {

        editMap.setView(
            [lat, lng],
            13
        );

    }


    if (editMarker) {

        editMap.removeLayer(editMarker);

    }


    if (
        provider.latitude !== null &&
        provider.longitude !== null
    ) {

        editMarker =
            L.marker([lat, lng])
                .addTo(editMap);

    }


    setTimeout(function () {

        if (editMap) {

            editMap.invalidateSize();

        }

    }, 300);

}


// ========================================
// SET EDIT LOCATION
// ========================================

function setEditLocation(lat, lng) {

    document.getElementById(
        "editLatitude"
    ).textContent = lat;


    document.getElementById(
        "editLongitude"
    ).textContent = lng;


    if (editMarker) {

        editMap.removeLayer(editMarker);

    }


    editMarker =
        L.marker([lat, lng])
            .addTo(editMap);


    editMarker.bindPopup(
        "Provider Location"
    ).openPopup();

}


// ========================================
// SAVE PROVIDER
// ========================================

async function saveProvider(e) {

    e.preventDefault();


    if (!editingProviderId) {

        return;

    }


    let latitude =
        document.getElementById(
            "editLatitude"
        ).textContent;


    let longitude =
        document.getElementById(
            "editLongitude"
        ).textContent;


    if (
        latitude === "Not selected" ||
        longitude === "Not selected"
    ) {

        latitude = null;
        longitude = null;

    }


    const provider = {

        name:
            document.getElementById(
                "editName"
            ).value.trim(),

        service:
            document.getElementById(
                "editService"
            ).value,

        area:
            document.getElementById(
                "editArea"
            ).value,

        phone:
            document.getElementById(
                "editPhone"
            ).value.trim(),

        hours:
            document.getElementById(
                "editHours"
            ).value.trim(),

        verified:
            document.getElementById(
                "editVerified"
            ).checked,

        latitude: latitude,

        longitude: longitude

    };


    try {

        const response =
            await fetch(
                `/api/providers/${editingProviderId}`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(provider)
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            alert(
                data.error ||
                "Could not update provider"
            );

            return;

        }


        alert(
            "Provider updated successfully!"
        );


        closeEditModal();


        loadProviders();

        loadStats();

    }

    catch (err) {

        console.error(err);

        alert("Server error.");

    }

}


// ========================================
// CLOSE EDIT MODAL
// ========================================

function closeEditModal() {

    const modal =
        document.getElementById("editModal");


    if (modal) {

        modal.style.display = "none";

    }


    editingProviderId = null;

}


// ========================================
// DELETE PROVIDER
// ========================================

async function deleteProvider(id) {

    const provider =
        providers.find(function (p) {

            return Number(p.id) === Number(id);

        });


    if (!provider) return;


    const confirmed =
        confirm(
            `Delete ${provider.name}?`
        );


    if (!confirmed) return;


    try {

        const response =
            await fetch(
                `/api/providers/${id}`,
                {
                    method: "DELETE"
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            alert(
                data.error ||
                "Could not delete provider"
            );

            return;

        }


        alert(
            "Provider deleted successfully!"
        );


        loadProviders();

        loadStats();

    }

    catch (err) {

        console.error(err);

        alert("Server error.");

    }

}


// ========================================
// LOAD STATISTICS
// ========================================

async function loadStats() {

    try {

        const response =
            await fetch("/api/admin/stats");


        if (!response.ok) {

            console.error(
                "Could not load statistics"
            );

            return;

        }


        const data =
            await response.json();


        // Main statistics

        document.getElementById(
            "totalProviders"
        ).textContent =
            data.totalProviders || 0;


        document.getElementById(
            "verifiedProviders"
        ).textContent =
            data.verifiedProviders || 0;


        document.getElementById(
            "averageRating"
        ).textContent =
            Number(
                data.averageRating || 0
            ).toFixed(1);


        document.getElementById(
            "totalReviews"
        ).textContent =
            data.totalReviews || 0;


        // Service chart

        renderBarChart(
            "serviceChart",
            data.services || [],
            "service",
            "count"
        );


        // Area chart

        renderBarChart(
            "areaChart",
            data.areas || [],
            "area",
            "count"
        );


        // Hide duplicate text lists

        const serviceStats =
            document.getElementById(
                "serviceStats"
            );


        const areaStats =
            document.getElementById(
                "areaStats"
            );


        if (serviceStats) {

            serviceStats.innerHTML = "";

        }


        if (areaStats) {

            areaStats.innerHTML = "";

        }

    }

    catch (err) {

        console.error(
            "Statistics error:",
            err
        );

    }

}


// ========================================
// BAR CHART
// ========================================

function renderBarChart(
    containerId,
    data,
    labelKey,
    valueKey
) {

    const container =
        document.getElementById(
            containerId
        );


    if (!container) return;


    container.innerHTML = "";


    if (!data || data.length === 0) {

        container.innerHTML = `
            <div class="empty-chart">
                No data available
            </div>
        `;

        return;

    }


    const maxValue =
        Math.max(
            ...data.map(function (item) {

                return Number(
                    item[valueKey]
                ) || 0;

            }),

            1
        );


    data.forEach(function (item) {

        const label =
            escapeHTML(
                String(
                    item[labelKey]
                )
            );


        const value =
            Number(
                item[valueKey]
            ) || 0;


        const percentage =
            (value / maxValue) * 100;


        const row =
            document.createElement("div");


        row.className =
            "chart-row";


        row.innerHTML = `

            <div class="chart-label">

                <span>
                    ${label}
                </span>

                <strong>
                    ${value}
                </strong>

            </div>


            <div class="chart-bar-bg">

                <div
                    class="chart-bar"
                    style="width: ${percentage}%"
                ></div>

            </div>

        `;


        container.appendChild(row);

    });

}


// ========================================
// ESCAPE HTML
// ========================================

function escapeHTML(value) {

    return String(value)

        .replace(/&/g, "&amp;")

        .replace(/</g, "&lt;")

        .replace(/>/g, "&gt;")

        .replace(/"/g, "&quot;")

        .replace(/'/g, "&#039;");

}


// ========================================
// MAKE FUNCTIONS AVAILABLE TO HTML
// ========================================

window.editProvider =
    editProvider;

window.deleteProvider =
    deleteProvider;