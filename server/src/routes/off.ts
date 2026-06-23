import { Router } from "express";
import { fetchByBarcode, searchByName } from "../services/openFoodFacts.js";

export const offRouter = Router();

/** GET /api/off/barcode/:code — lookup prodotto per codice a barre. */
offRouter.get("/barcode/:code", async (req, res) => {
  const code = req.params.code;
  if (!/^\d{6,14}$/.test(code)) {
    res.status(400).json({ error: "bad_request", detail: "codice a barre non valido" });
    return;
  }
  try {
    const product = await fetchByBarcode(code);
    if (!product) {
      res.status(404).json({ error: "not_found", detail: "prodotto non trovato su Open Food Facts" });
      return;
    }
    res.json(product);
  } catch (err) {
    console.error("[off] errore barcode:", err);
    res.status(502).json({ error: "off_request_failed" });
  }
});

/** GET /api/off/search?q=... — ricerca prodotti per nome. */
offRouter.get("/search", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q.length < 2) {
    res.status(400).json({ error: "bad_request", detail: "q (>= 2 caratteri) richiesto" });
    return;
  }
  try {
    res.json(await searchByName(q));
  } catch (err) {
    console.error("[off] errore search:", err);
    res.status(502).json({ error: "off_request_failed" });
  }
});
