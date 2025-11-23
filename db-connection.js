const mongoose = require("mongoose");

const dbUri = process.env.DB || "mongodb://127.0.0.1:27017/stockchecker";

mongoose.set("strictQuery", false);

const connectOptions = {
	useNewUrlParser: true,
	useUnifiedTopology: true,
};

mongoose
	.connect(dbUri, connectOptions)
	.then(() => {
		console.log("MongoDB connected to", dbUri);
	})
	.catch((err) => {
		console.error("MongoDB connection error:", err && err.message ? err.message : err);
	});

module.exports = mongoose;