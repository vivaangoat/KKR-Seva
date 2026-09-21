let providers = [];

let selectedCategory = "all";


// ===============================
// MAP
// ===============================

let map;

let mapMarkers = [];


// Kurukshetra center

const KURUKSHETRA_CENTER = [
    29.9695,
    76.8783
];


// ===============================
// OLD AREA LOCATIONS
// FALLBACK FOR OLD PROVIDERS
// ===============================

const areaLocations = {

    "Thanesar": [
        29.9735,
        76.8370
    ],

    "Pipli": [
        29.9635,
        76.8600
    ],

    "Sector 7": [
        29.9480,
        76.8350
    ],

    "Sector 13": [
        29.9500,
        76.8700
    ],

    "University Area": [
        29.9460,
        76.8200
    ],

    "Pipli Road": [
        29.9550,
        76.8500
    ]

};


// ===============================
// INITIALIZE MAP
// ===============================

function initializeMap() {

    map = L.map("map").setView(
        KURUKSHETRA_CENTER,
        13
    );


    // Working OpenStreetMap tile server

    L.tileLayer(
        "https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png",
        {
            maxZoom: 19,

            attribution:
                "&copy; OpenStreetMap contributors"
        }
    ).addTo(map);

}




// ===============================
// GET PROVIDER LOCATION
// ===============================

function getProviderLocation(provider) {

    // Use exact location if available

    if (
        provider.latitude !== null &&
        provider.longitude !== null &&
        provider.latitude !== undefined &&
        provider.longitude !== undefined
    ) {

        return [

            Number(provider.latitude),

            Number(provider.longitude)

        ];

    }


    // Otherwise use area location

    if (areaLocations[provider.area]) {

        return areaLocations[provider.area];

    }


    return null;

}


// ===============================
// UPDATE MAP MARKERS
// ===============================

function updateMapMarkers(list) {

    if (!map) {

        return;

    }


    // Remove old markers

    mapMarkers.forEach(
        function(marker) {

            map.removeLayer(marker);

        }
    );


    mapMarkers = [];


    list.forEach(
        function(provider) {

            let location =
                getProviderLocation(provider);


            if (!location) {

                return;

            }


            let marker =
                L.marker(location)
                .addTo(map);


            let verifiedHTML =
                provider.verified
                ? `
                    <span class="verified-badge">
                        ✓ Verified
                    </span>
                  `
                : "";


            let ratingHTML =
                provider.review_count > 0

                ? `
                    ⭐ ${provider.average_rating}
                    (${provider.review_count} reviews)
                  `

                : `
                    ⭐ No reviews yet
                  `;


            marker.bindPopup(`

                <div class="map-popup">

                    <h3>

                        ${getIcon(provider.service)}

                        ${provider.name}

                    </h3>


                    ${verifiedHTML}


                    <p>

                        <strong>
                            ${provider.service}
                        </strong>

                    </p>


                    <p>
                        📍 ${provider.area},
                        Kurukshetra
                    </p>


                    <p>
                        ${ratingHTML}
                    </p>


                    <p>
                        🕐 ${provider.hours}
                    </p>


                    <div class="map-popup-buttons">

                        <a
                            href="tel:${provider.phone}"
                            class="map-call-btn">

                            📞 Call

                        </a>


                        <a
                            href="${getWhatsAppLink(provider.phone)}"
                            target="_blank"
                            class="map-whatsapp-btn">

                            💬 WhatsApp

                        </a>

                    </div>

                </div>

            `);


            mapMarkers.push(marker);

        }
    );

}


// ===============================
// LOAD PROVIDERS
// ===============================

async function loadProviders() {

    try {

        let response =
            await fetch("/api/providers");


        providers =
            await response.json();


        filterProviders();

    }

    catch (error) {

        console.log(
            "Could not load providers:",
            error
        );

    }

}


// ===============================
// DISPLAY PROVIDERS
// ===============================

function displayProviders(list) {

    let providerList =
        document.getElementById("providerList");


    providerList.innerHTML = "";


    // Update map with the same filtered providers

    updateMapMarkers(list);


    if (list.length === 0) {

        providerList.innerHTML = `

            <div class="no-results">

                <div class="no-results-icon">
                    🔍
                </div>

                <h3>
                    No providers found
                </h3>

                <p>
                    Try changing your search or filters.
                </p>

                <button
                    onclick="showAll()"
                    class="reset-results-btn">

                    View All Providers

                </button>

            </div>

        `;

        return;

    }


    list.forEach(function(provider) {

        let rating =
            Number(
                provider.average_rating || 0
            );


        let reviewCount =
            Number(
                provider.review_count || 0
            );


        let ratingHTML;


        if (reviewCount > 0) {

            ratingHTML = `

                <div class="card-rating">

                    <span class="stars">
                        ⭐
                    </span>

                    <strong>
                        ${rating.toFixed(1)}
                    </strong>

                    <span class="review-count">
                        (${reviewCount} reviews)
                    </span>

                </div>

            `;

        } else {

            ratingHTML = `

                <div class="card-rating no-rating">

                    ⭐ No reviews yet

                </div>

            `;

        }


        let verifiedHTML =
            provider.verified

            ? `

                <span class="verified-badge">

                    ✓ Verified

                </span>

              `

            : "";


        providerList.innerHTML += `

            <article class="provider-card">

                <div class="provider-card-top">


                    <div class="provider-icon">

                        ${getIcon(provider.service)}

                    </div>


                    <div class="provider-main">

                        <div class="provider-name-row">

                            <h3>
                                ${provider.name}
                            </h3>

                            ${verifiedHTML}

                        </div>


                        <p class="provider-service">

                            ${provider.service}

                        </p>


                        ${ratingHTML}

                    </div>

                </div>


                <div class="provider-details">


                    <div class="provider-detail">

                        <span class="detail-icon">
                            📍
                        </span>

                        <div>

                            <small>
                                Location
                            </small>

                            <strong>
                                ${provider.area}
                            </strong>

                        </div>

                    </div>


                    <div class="provider-detail">

                        <span class="detail-icon">
                            🕐
                        </span>

                        <div>

                            <small>
                                Working Hours
                            </small>

                            <strong>
                                ${provider.hours}
                            </strong>

                        </div>

                    </div>


                </div>


                <div class="provider-actions">


                    <button
                        class="details-btn"
                        onclick="showDetails(${provider.id})">

                        View Details

                    </button>


                    <a
                        class="call-btn"
                        href="tel:${provider.phone}">

                        📞 Call

                    </a>


                    <a
                        class="whatsapp-btn"
                        href="${getWhatsAppLink(provider.phone)}"
                        target="_blank">

                        💬 WhatsApp

                    </a>


                </div>


            </article>

        `;

    });

}


// ===============================
// GET ICON
// ===============================

function getIcon(service) {

    if (service === "Plumber")
        return "🔧";


    if (service === "Electrician")
        return "⚡";


    if (service === "Maid")
        return "🧹";


    if (service === "Carpenter")
        return "🪚";


    if (service === "Painter")
        return "🎨";


    if (service === "Mechanic")
        return "🚗";


    return "👤";

}


// ===============================
// WHATSAPP
// ===============================

function getWhatsAppLink(phone) {

    let number =
        phone.replace(/\D/g, "");


    if (number.length === 10) {

        number =
            "91" + number;

    }


    return "https://wa.me/" + number;

}


// ===============================
// SHOW DETAILS
// ===============================

async function showDetails(id) {

    let provider =
        providers.find(
            function(item) {

                return item.id === id;

            }
        );


    if (!provider) {

        return;

    }


    document.getElementById(
        "modal"
    ).style.display = "flex";


    document.getElementById(
        "modalContent"
    ).innerHTML = `

        <button
            class="close-btn"
            onclick="closeDetails()">

            ×

        </button>


        <div class="big-icon">

            ${getIcon(provider.service)}

        </div>


        <h2>

            ${provider.name}

            ${
                provider.verified

                ? `
                    <span class="verified-badge">
                        ✓ Verified
                    </span>
                  `

                : ""
            }

        </h2>


        <p class="service">

            ${provider.service}

        </p>


        <div class="details-rating">

            ⭐

            ${
                provider.review_count > 0
                ? provider.average_rating
                : "No rating yet"
            }


            ${
                provider.review_count > 0
                ? `(${provider.review_count} reviews)`
                : ""
            }

        </div>


        <hr>


        <p>

            📍 <b>Location:</b>

            ${provider.area},
            Kurukshetra

        </p>


        <p>

            📞 <b>Phone:</b>

            ${provider.phone}

        </p>


        <p>

            🕐 <b>Working Hours:</b>

            ${provider.hours}

        </p>


        <div class="modal-buttons">

            <a
                class="modal-call"
                href="tel:${provider.phone}">

                📞 Call

            </a>


            <a
                class="modal-whatsapp"
                href="${getWhatsAppLink(provider.phone)}"
                target="_blank">

                💬 WhatsApp

            </a>

        </div>


        <hr>


        <div class="review-section">

            <h3>
                ⭐ Reviews
            </h3>


            <div id="reviewsList">

                Loading reviews...

            </div>


            <h3>
                Leave a Review
            </h3>


            <form
                id="reviewForm"
                class="review-form"
            >

                <input
                    type="text"
                    id="reviewerName"
                    placeholder="Your name"
                    maxlength="50"
                    required
                >


                <select
                    id="reviewRating"
                    required
                >

                    <option value="">
                        Choose rating
                    </option>

                    <option value="5">
                        ⭐⭐⭐⭐⭐ 5 - Excellent
                    </option>

                    <option value="4">
                        ⭐⭐⭐⭐ 4 - Good
                    </option>

                    <option value="3">
                        ⭐⭐⭐ 3 - Average
                    </option>

                    <option value="2">
                        ⭐⭐ 2 - Poor
                    </option>

                    <option value="1">
                        ⭐ 1 - Very Poor
                    </option>

                </select>


                <textarea
                    id="reviewComment"
                    placeholder="Write a short review..."
                    maxlength="300"
                    required
                ></textarea>


                <button type="submit">

                    Submit Review

                </button>

            </form>

        </div>

    `;


    loadReviews(id);


    document
        .getElementById("reviewForm")
        .addEventListener(
            "submit",

            function(event) {

                submitReview(
                    event,
                    id
                );

            }
        );

}


// ===============================
// LOAD REVIEWS
// ===============================

async function loadReviews(providerId) {

    let reviewsList =
        document.getElementById(
            "reviewsList"
        );


    try {

        let response =
            await fetch(
                `/api/providers/${providerId}/reviews`
            );


        let reviews =
            await response.json();


        if (reviews.length === 0) {

            reviewsList.innerHTML = `

                <div class="no-reviews">

                    No reviews yet.

                    Be the first to review!

                </div>

            `;

            return;

        }


        reviewsList.innerHTML = "";


        reviews.forEach(
            function(review) {

                let stars =
                    "⭐".repeat(
                        review.rating
                    );


                reviewsList.innerHTML += `

                    <div class="review-card">

                        <div class="review-header">

                            <strong>
                                ${review.reviewer}
                            </strong>

                            <span>
                                ${stars}
                            </span>

                        </div>


                        <p>
                            ${review.comment}
                        </p>

                    </div>

                `;

            }
        );

    }

    catch (error) {

        reviewsList.innerText =
            "Could not load reviews.";

    }

}


// ===============================
// SUBMIT REVIEW
// ===============================

async function submitReview(
    event,
    providerId
) {

    event.preventDefault();


    let reviewer =
        document
        .getElementById(
            "reviewerName"
        )
        .value
        .trim();


    let rating =
        document
        .getElementById(
            "reviewRating"
        )
        .value;


    let comment =
        document
        .getElementById(
            "reviewComment"
        )
        .value
        .trim();


    try {

        let response =
            await fetch(
                `/api/providers/${providerId}/reviews`,

                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            reviewer:
                                reviewer,

                            rating:
                                Number(rating),

                            comment:
                                comment

                        })

                }
            );


        let result =
            await response.json();


        if (!response.ok) {

            alert(
                result.error
            );

            return;

        }


        alert(
            "⭐ Review added successfully!"
        );


        document
            .getElementById(
                "reviewForm"
            )
            .reset();


        loadReviews(
            providerId
        );


        loadProviders();

    }

    catch (error) {

        alert(
            "Could not submit review."
        );

    }

}


// ===============================
// CLOSE DETAILS
// ===============================

function closeDetails() {

    document.getElementById(
        "modal"
    ).style.display = "none";

}


// ===============================
// FILTER PROVIDERS
// ===============================

function filterProviders() {

    let searchText =
        document.getElementById(
            "search"
        ).value
        .toLowerCase()
        .trim();


    let selectedArea =
        document.getElementById(
            "area"
        ).value;


    let ratingFilter =
        document.getElementById(
            "ratingFilter"
        ).value;


    let verifiedFilter =
        document.getElementById(
            "verifiedFilter"
        ).value;


    let sortBy =
        document.getElementById(
            "sortBy"
        ).value;


    let filtered =
        providers.filter(
            function(provider) {

                // =========================
                // SEARCH
                // =========================

                let text =
                    (
                        provider.name +
                        " " +
                        provider.service +
                        " " +
                        provider.area
                    )
                    .toLowerCase();


                let searchMatch =
                    text.includes(
                        searchText
                    );


                // =========================
                // AREA
                // =========================

                let areaMatch =
                    selectedArea === "all" ||
                    provider.area === selectedArea;


                // =========================
                // CATEGORY
                // =========================

                let categoryMatch =
                    selectedCategory === "all" ||
                    provider.service === selectedCategory;


                // =========================
                // RATING
                // =========================

                let rating =
                    Number(
                        provider.average_rating || 0
                    );


                let ratingMatch =
                    ratingFilter === "all" ||
                    rating >= Number(
                        ratingFilter
                    );


                // =========================
                // VERIFIED
                // =========================

                let verifiedMatch =
                    verifiedFilter === "all" ||
                    Boolean(provider.verified);


                return (

                    searchMatch &&
                    areaMatch &&
                    categoryMatch &&
                    ratingMatch &&
                    verifiedMatch

                );

            }
        );


    // =========================
    // SORT
    // =========================

    if (sortBy === "rating") {

        filtered.sort(
            function(a, b) {

                return (
                    Number(
                        b.average_rating || 0
                    ) -
                    Number(
                        a.average_rating || 0
                    )
                );

            }
        );

    }


    if (sortBy === "name") {

        filtered.sort(
            function(a, b) {

                return a.name
                    .toLowerCase()
                    .localeCompare(
                        b.name.toLowerCase()
                    );

            }
        );

    }


    displayProviders(
        filtered
    );

}


// ===============================
// SHOW CATEGORY
// ===============================

function showCategory(category) {

    selectedCategory =
        category;


    filterProviders();


    document.getElementById(
        "providerTitle"
    ).innerText =
        category +
        "s in Kurukshetra";


    document.getElementById(
        "providers"
    ).scrollIntoView({
        behavior: "smooth"
    });

}


// ===============================
// SHOW ALL
// ===============================

function showAll() {

    selectedCategory = "all";


    document.getElementById(
        "search"
    ).value = "";


    document.getElementById(
        "area"
    ).value = "all";


    document.getElementById(
        "ratingFilter"
    ).value = "all";


    document.getElementById(
        "verifiedFilter"
    ).value = "all";


    document.getElementById(
        "sortBy"
    ).value = "default";


    filterProviders();


    document.getElementById(
        "providerTitle"
    ).innerText =
        "Service Providers in Kurukshetra";

}


// ===============================
// SEARCH
// ===============================

document
    .getElementById("search")
    .addEventListener(
        "input",
        filterProviders
    );


// ===============================
// AREA FILTER
// ===============================

document
    .getElementById("area")
    .addEventListener(
        "change",
        filterProviders
    );

document
    .getElementById("ratingFilter")
    .addEventListener(
        "change",
        filterProviders
    );


document
    .getElementById("verifiedFilter")
    .addEventListener(
        "change",
        filterProviders
    );


document
    .getElementById("sortBy")
    .addEventListener(
        "change",
        filterProviders
    );


// ===============================
// CLOSE MODAL OUTSIDE
// ===============================

document
    .getElementById("modal")
    .addEventListener(
        "click",

        function(event) {

            if (
                event.target ===
                document.getElementById(
                    "modal"
                )
            ) {

                closeDetails();

            }

        }
    );


// ===============================
// INITIAL LOAD
// ===============================

initializeMap();

loadProviders();


// ===============================
// AUTO REFRESH
// ===============================

setInterval(
    loadProviders,
    3000
);