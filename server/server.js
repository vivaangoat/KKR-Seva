import express from "express";
import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import dotenv from "dotenv";
import helmet from "helmet";

dotenv.config();

const app = express();


// ===============================
// SECURITY
// ===============================

app.use(
    helmet({
        contentSecurityPolicy: false
    })
);


// ===============================
// MIDDLEWARE
// ===============================

app.use(express.json());

app.use(
    session({
        secret:
            process.env.SESSION_SECRET ||
            "change-this-secret",

        resave: false,

        saveUninitialized: false,
        
cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 1000 * 60 * 60 * 4
}
    })
);


// ===============================
// STATIC FILES
// ===============================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicPath =
    path.join(__dirname, "..", "public");

app.use(
    express.static(publicPath)
);

``
// ===============================
// DATABASE
// ===============================

const db = new sqlite3.Database(
    path.join(__dirname, "kkrseva.db")
);


db.run(
    "PRAGMA foreign_keys = ON"
);


// ===============================
// CLEAN OLD ORPHAN REVIEWS
// ===============================

db.run(`

    DELETE FROM reviews

    WHERE provider_id NOT IN (

        SELECT id
        FROM providers

    )

`);


// ===============================
// CREATE PROVIDERS TABLE
// ===============================

db.run(`

    CREATE TABLE IF NOT EXISTS providers (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        name TEXT NOT NULL,

        service TEXT NOT NULL,

        area TEXT NOT NULL,

        phone TEXT NOT NULL,

        hours TEXT NOT NULL,

        verified INTEGER DEFAULT 0,

        latitude REAL,

        longitude REAL

    )

`);


// ===============================
// ADD COLUMNS FOR OLD DATABASES
// ===============================

db.run(`

    ALTER TABLE providers
    ADD COLUMN verified INTEGER DEFAULT 0

`, () => {});


db.run(`

    ALTER TABLE providers
    ADD COLUMN latitude REAL

`, () => {});


db.run(`

    ALTER TABLE providers
    ADD COLUMN longitude REAL

`, () => {});


// ===============================
// REVIEWS TABLE
// ===============================

db.run(`

    CREATE TABLE IF NOT EXISTS reviews (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        provider_id INTEGER NOT NULL,

        reviewer TEXT NOT NULL,

        rating INTEGER NOT NULL,

        comment TEXT NOT NULL,

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (
            provider_id
        )

        REFERENCES providers(id)

        ON DELETE CASCADE

    )

`);


// ===============================
// VALIDATION HELPERS
// ===============================

function cleanText(value, maxLength) {

    if (
        typeof value !==
        "string"
    ) {

        return "";

    }


    return value
        .trim()
        .slice(0, maxLength);

}


function validPhone(phone) {

    return /^[0-9+\-\s()]{7,20}$/
        .test(phone);

}


function validRating(rating) {

    return (

        Number.isInteger(
            Number(rating)
        )

        &&

        Number(rating) >= 1

        &&

        Number(rating) <= 5

    );

}


function validCoordinate(
    value,
    min,
    max
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return true;

    }


    const number =
        Number(value);


    return (

        Number.isFinite(number)

        &&

        number >= min

        &&

        number <= max

    );

}


// ===============================
// ADMIN AUTH
// ===============================

function requireAdmin(
    req,
    res,
    next
) {

    if (
        req.session &&
        req.session.isAdmin === true
    ) {

        return next();

    }


    return res.status(401).json({

        error:
            "Admin authentication required."

    });

}


// ===============================
// LOGIN
// ===============================

app.post(
    "/api/login",

    (req, res) => {

        const password =
            req.body.password;


        const adminPassword =
            process.env.ADMIN_PASSWORD;


        if (
            !adminPassword
        ) {

            return res.status(500).json({

                error:
                    "Admin password is not configured."

            });

        }


        if (
            typeof password !==
            "string"
        ) {

            return res.status(400).json({

                error:
                    "Password is required."

            });

        }


        if (
            password !==
            adminPassword
        ) {

            return res.status(401).json({

                error:
                    "Incorrect password."

            });

        }


        req.session.isAdmin =
            true;


        res.json({

            success: true

        });

    }
);


// ===============================
// CHECK LOGIN
// ===============================

app.get(
    "/api/me",

    (req, res) => {

        res.json({

            isAdmin:
                req.session &&
                req.session.isAdmin === true

        });

    }
);


// ===============================
// LOGOUT
// ===============================

app.post(
    "/api/logout",

    (req, res) => {

        req.session.destroy(
            () => {

                res.json({

                    success: true

                });

            }
        );

    }
);


// ===============================
// GET PROVIDERS
// ===============================

app.get(
    "/api/providers",

    (req, res) => {

        db.all(`

            SELECT

                p.*,

                COALESCE(
                    ROUND(
                        AVG(r.rating),
                        1
                    ),
                    0
                ) AS average_rating,

                COUNT(r.id)
                AS review_count

            FROM providers p

            LEFT JOIN reviews r

                ON p.id =
                   r.provider_id

            GROUP BY p.id

            ORDER BY p.id DESC

        `,

        (err, rows) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    error:
                        "Could not load providers."

                });

            }


            res.json(rows);

        });

    }
);


// ===============================
// ADMIN STATS
// ===============================

app.get(
    "/api/admin/stats",

    requireAdmin,

    (req, res) => {

        const stats = {};


        db.get(
            `
            SELECT COUNT(*) AS count
            FROM providers
            `,

            (err, row) => {

                if (err) {

                    return res.status(500).json({

                        error:
                            "Could not load statistics."

                    });

                }


                stats.totalProviders =
                    row.count;


                db.get(
                    `
                    SELECT COUNT(*) AS count
                    FROM providers
                    WHERE verified = 1
                    `,

                    (err, row) => {

                        stats.verifiedProviders =
                            row.count;


                        db.get(
                            `
                            SELECT COUNT(*) AS count
                            FROM reviews
                            `,

                            (err, row) => {

                                stats.totalReviews =
                                    row.count;


                                db.get(
                                    `
                                    SELECT
                                        ROUND(
                                            AVG(rating),
                                            1
                                        ) AS average
                                    FROM reviews
                                    `,

                                    (err, row) => {

                                        stats.averageRating =
                                            row.average ||
                                            0;


                                        db.all(
                                            `
                                            SELECT
                                                service,
                                                COUNT(*) AS count
                                            FROM providers
                                            GROUP BY service
                                            ORDER BY count DESC
                                            `,

                                            (err, rows) => {

                                                stats.services =
                                                    rows;


                                                db.all(
                                                    `
                                                    SELECT
                                                        area,
                                                        COUNT(*) AS count
                                                    FROM providers
                                                    GROUP BY area
                                                    ORDER BY count DESC
                                                    `,

                                                    (err, rows) => {

                                                        stats.areas =
                                                            rows;


                                                        res.json(
                                                            stats
                                                        );

                                                    }
                                                );

                                            }
                                        );

                                    }
                                );

                            }
                        );

                    }
                );

            }
        );

    }
);


// ===============================
// ADD PROVIDER
// ===============================

app.post(
    "/api/providers",

    requireAdmin,

    (req, res) => {

        const name =
            cleanText(
                req.body.name,
                100
            );


        const service =
            cleanText(
                req.body.service,
                50
            );


        const area =
            cleanText(
                req.body.area,
                80
            );


        const phone =
            cleanText(
                req.body.phone,
                20
            );


        const hours =
            cleanText(
                req.body.hours,
                100
            );


        const verified =
            req.body.verified
                ? 1
                : 0;


        const latitude =
            req.body.latitude !== null &&
            req.body.latitude !== undefined &&
            req.body.latitude !== ""

                ? Number(
                    req.body.latitude
                )

                : null;


        const longitude =
            req.body.longitude !== null &&
            req.body.longitude !== undefined &&
            req.body.longitude !== ""

                ? Number(
                    req.body.longitude
                )

                : null;


        if (
            !name ||
            !service ||
            !area ||
            !phone ||
            !hours
        ) {

            return res.status(400).json({

                error:
                    "Please fill all required fields."

            });

        }


        if (
            !validPhone(phone)
        ) {

            return res.status(400).json({

                error:
                    "Invalid phone number."

            });

        }


        if (
            !validCoordinate(
                latitude,
                -90,
                90
            )
        ) {

            return res.status(400).json({

                error:
                    "Invalid latitude."

            });

        }


        if (
            !validCoordinate(
                longitude,
                -180,
                180
            )
        ) {

            return res.status(400).json({

                error:
                    "Invalid longitude."

            });

        }


        db.run(`

            INSERT INTO providers (

                name,

                service,

                area,

                phone,

                hours,

                verified,

                latitude,

                longitude

            )

            VALUES (?, ?, ?, ?, ?, ?, ?, ?)

        `,

        [

            name,

            service,

            area,

            phone,

            hours,

            verified,

            latitude,

            longitude

        ],

        function(err) {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    error:
                        "Could not add provider."

                });

            }


            res.json({

                success: true,

                id: this.lastID

            });

        });

    }
);


// ===============================
// UPDATE PROVIDER
// ===============================

app.put(
    "/api/providers/:id",

    requireAdmin,

    (req, res) => {

        const id =
            Number(
                req.params.id
            );


        if (
            !Number.isInteger(id) ||
            id <= 0
        ) {

            return res.status(400).json({

                error:
                    "Invalid provider ID."

            });

        }


        const name =
            cleanText(
                req.body.name,
                100
            );


        const service =
            cleanText(
                req.body.service,
                50
            );


        const area =
            cleanText(
                req.body.area,
                80
            );


        const phone =
            cleanText(
                req.body.phone,
                20
            );


        const hours =
            cleanText(
                req.body.hours,
                100
            );


        const verified =
            req.body.verified
                ? 1
                : 0;


        const latitude =
            req.body.latitude !== null &&
            req.body.latitude !== undefined &&
            req.body.latitude !== ""

                ? Number(
                    req.body.latitude
                )

                : null;


        const longitude =
            req.body.longitude !== null &&
            req.body.longitude !== undefined &&
            req.body.longitude !== ""

                ? Number(
                    req.body.longitude
                )

                : null;


        if (
            !name ||
            !service ||
            !area ||
            !phone ||
            !hours
        ) {

            return res.status(400).json({

                error:
                    "Please fill all required fields."

            });

        }


        if (
            !validPhone(phone)
        ) {

            return res.status(400).json({

                error:
                    "Invalid phone number."

            });

        }


        if (
            !validCoordinate(
                latitude,
                -90,
                90
            )
        ) {

            return res.status(400).json({

                error:
                    "Invalid latitude."

            });

        }


        if (
            !validCoordinate(
                longitude,
                -180,
                180
            )
        ) {

            return res.status(400).json({

                error:
                    "Invalid longitude."

            });

        }


        db.run(`

            UPDATE providers

            SET

                name = ?,

                service = ?,

                area = ?,

                phone = ?,

                hours = ?,

                verified = ?,

                latitude = ?,

                longitude = ?

            WHERE id = ?

        `,

        [

            name,

            service,

            area,

            phone,

            hours,

            verified,

            latitude,

            longitude,

            id

        ],

        function(err) {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    error:
                        "Could not update provider."

                });

            }


            if (
                this.changes === 0
            ) {

                return res.status(404).json({

                    error:
                        "Provider not found."

                });

            }


            res.json({

                success: true

            });

        });

    }
);


// ===============================
// DELETE PROVIDER
// ===============================

app.delete(
    "/api/providers/:id",

    requireAdmin,

    (req, res) => {

        const id =
            Number(
                req.params.id
            );


        if (
            !Number.isInteger(id) ||
            id <= 0
        ) {

            return res.status(400).json({

                error:
                    "Invalid provider ID."

            });

        }


        // Delete reviews first.

        db.run(
            `
            DELETE FROM reviews
            WHERE provider_id = ?
            `,

            [id],

            (err) => {

                if (err) {

                    console.error(err);

                    return res.status(500).json({

                        error:
                            "Could not delete provider reviews."

                    });

                }


                // Then delete provider.

                db.run(
                    `
                    DELETE FROM providers
                    WHERE id = ?
                    `,

                    [id],

                    function(err) {

                        if (err) {

                            console.error(err);

                            return res.status(500).json({

                                error:
                                    "Could not delete provider."

                            });

                        }


                        if (
                            this.changes === 0
                        ) {

                            return res.status(404).json({

                                error:
                                    "Provider not found."

                            });

                        }


                        res.json({

                            success: true

                        });

                    }
                );

            }
        );

    }
);


// ===============================
// GET REVIEWS
// ===============================

app.get(
    "/api/providers/:id/reviews",

    (req, res) => {

        const id =
            Number(
                req.params.id
            );


        if (
            !Number.isInteger(id) ||
            id <= 0
        ) {

            return res.status(400).json({

                error:
                    "Invalid provider ID."

            });

        }


        db.all(
            `
            SELECT
                id,
                reviewer,
                rating,
                comment,
                created_at
            FROM reviews
            WHERE provider_id = ?
            ORDER BY created_at DESC
            `,

            [id],

            (err, rows) => {

                if (err) {

                    console.error(err);

                    return res.status(500).json({

                        error:
                            "Could not load reviews."

                    });

                }


                res.json(rows);

            }
        );

    }
);


// ===============================
// ADD REVIEW
// ===============================

app.post(
    "/api/providers/:id/reviews",

    (req, res) => {

        const providerId =
            Number(
                req.params.id
            );


        if (
            !Number.isInteger(
                providerId
            ) ||
            providerId <= 0
        ) {

            return res.status(400).json({

                error:
                    "Invalid provider ID."

            });

        }


        const reviewer =
            cleanText(
                req.body.reviewer,
                50
            );


        const comment =
            cleanText(
                req.body.comment,
                300
            );


        const rating =
            Number(
                req.body.rating
            );


        if (
            !reviewer ||
            !comment
        ) {

            return res.status(400).json({

                error:
                    "Name and review are required."

            });

        }


        if (
            !validRating(rating)
        ) {

            return res.status(400).json({

                error:
                    "Rating must be between 1 and 5."

            });

        }


        db.get(
            `
            SELECT id
            FROM providers
            WHERE id = ?
            `,

            [providerId],

            (err, provider) => {

                if (err) {

                    console.error(err);

                    return res.status(500).json({

                        error:
                            "Database error."

                    });

                }


                if (!provider) {

                    return res.status(404).json({

                        error:
                            "Provider not found."

                    });

                }


                db.run(
                    `
                    INSERT INTO reviews (

                        provider_id,

                        reviewer,

                        rating,

                        comment

                    )

                    VALUES (?, ?, ?, ?)

                    `,

                    [

                        providerId,

                        reviewer,

                        rating,

                        comment

                    ],

                    function(err) {

                        if (err) {

                            console.error(err);

                            return res.status(500).json({

                                error:
                                    "Could not add review."

                            });

                        }


                        res.json({

                            success: true,

                            id: this.lastID

                        });

                    }
                );

            }
        );

    }
);


// ===============================
// DELETE REVIEW
// ===============================

app.delete(
    "/api/reviews/:id",

    requireAdmin,

    (req, res) => {

        const id =
            Number(
                req.params.id
            );


        if (
            !Number.isInteger(id) ||
            id <= 0
        ) {

            return res.status(400).json({

                error:
                    "Invalid review ID."

            });

        }


        db.run(
            `
            DELETE FROM reviews
            WHERE id = ?
            `,

            [id],

            function(err) {

                if (err) {

                    console.error(err);

                    return res.status(500).json({

                        error:
                            "Could not delete review."

                    });

                }


                if (
                    this.changes === 0
                ) {

                    return res.status(404).json({

                        error:
                            "Review not found."

                    });

                }


                res.json({

                    success: true

                });

            }
        );

    }
);


// ===============================
// START SERVER
// ===============================

const PORT =
    process.env.PORT || 3000;





app.listen(
    PORT,

    () => {

        console.log(
            `KKR Seva server running at http://localhost:${PORT}`
        );

    }
);