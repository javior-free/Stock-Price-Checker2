"use strict";
const StockModel = require("../models").Stock;
const fetch = require("node-fetch");
const AbortController = global.AbortController || require('abort-controller');

async function createStock(stock, like, ip) {
  if (!stock) {
    throw new Error('Invalid stock value');
  }
  const newStock = new StockModel({
    symbol: stock,
    stock: stock,
    likes: like ? [ip] : [],
  });
  try {
    const savedNew = await newStock.save();
    return savedNew;
  } catch (err) {
    // If duplicate key (index issues), try to find existing and return it
    if (err && err.code === 11000) {
      const existing = await findStock(stock);
      if (existing) return existing;
    }
    throw err;
  }
}

async function findStock(stock) {
  return await StockModel.findOne({ $or: [{ symbol: stock }, { stock: stock }] }).exec();
}

async function saveStock(stock, like, ip) {
  let saved = {};
  if (!stock) {
    // avoid creating entries with falsy stock values
    return { likes: [] };
  }
  const foundStock = await findStock(stock);
  if (!foundStock) {
    const createsaved = await createStock(stock, like, ip);
    saved = createsaved;
    return saved;
  } else {
    if (like && foundStock.likes.indexOf(ip) === -1) {
      foundStock.likes.push(ip);
    }
    saved = await foundStock.save();
    return saved;
  }
}

async function getStock(stock) {
  const TIMEOUT = 5000; // ms
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const response = await fetch(
      `https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${stock}/quote`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    const { symbol, latestPrice } = await response.json();
    return { symbol, latestPrice };
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      console.error(`getStock timeout for ${stock}`);
    } else {
      console.error("getStock error for", stock, err && err.message ? err.message : err);
    }
    return { symbol: null, latestPrice: null };
  }
}

module.exports = function (app) {
  //https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/TSLA/quote

  app.route("/api/stock-prices").get(async function (req, res) {
    const { stock, like } = req.query;
    try {
    if (Array.isArray(stock)) {
      console.log("stocks", stock);

      const { symbol, latestPrice } = await getStock(stock[0]);
      const { symbol: symbol2, latestPrice: latestPrice2 } = await getStock(
        stock[1]
      );

      const firststock = await saveStock(stock[0], like, req.ip);
      const secondstock = await saveStock(stock[1], like, req.ip);

      let stockData = [];
      if (!symbol) {
        stockData.push({
          rel_likes: firststock.likes.length - secondstock.likes.length,
        });
      } else {
        stockData.push({
          stock: symbol,
          price: latestPrice,
          rel_likes: firststock.likes.length - secondstock.likes.length,
        });
      }

      if (!symbol2) {
        stockData.push({
          rel_likes: secondstock.likes.length - firststock.likes.length,
        });
      } else {
        stockData.push({
          stock: symbol2,
          price: latestPrice2,
          rel_likes: secondstock.likes.length - firststock.likes.length,
        });
      }

      res.json({ stockData });
      return;
    }
    const { symbol, latestPrice } = await getStock(stock);
    if (!symbol) {
      res.json({ stockData: { likes: like ? 1 : 0 } });
      return;
    }

    const oneStockData = await saveStock(symbol, like, req.ip);
    console.log("One Stock Data", oneStockData);

    res.json({
      stockData: {
        stock: symbol,
        price: latestPrice,
        likes: oneStockData.likes.length,
      },
    });
    } catch (err) {
      console.error('Error in /api/stock-prices handler:', err && err.message ? err.message : err);
      res.status(500).json({ error: 'Server error' });
    }
  });
};