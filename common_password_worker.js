const LEET_TRANSLATION = {
	"0": "o",
	"1": "i",
	"3": "e",
	"4": "a",
	"5": "s",
	"7": "t",
	"@": "a",
	"$": "s",
};
const MIN_MATCH_LENGTH = 4;
let commonPasswords = new Set();
let maxPasswordLength = 0;

function compactPassword(password) {
	return password.toLowerCase()
		.replace(/[013457@$]/g, character => LEET_TRANSLATION[character])
		.replace(/[^a-z0-9]/g, "");
}

async function loadCommonPasswords() {
	const response = await fetch("common_passwords.txt");
	if (!response.ok) {
		throw new Error(`Could not load the common-password list (HTTP ${response.status}).`);
	}

	let text = await response.text();
	let entryCount = 0;
	let start = 0;
	while (start < text.length) {
		let end = text.indexOf("\n", start);
		if (end === -1) {
			end = text.length;
		}
		const entry = text.slice(start, end).trim();
		if (entry) {
			entryCount += 1;
			const normalized = compactPassword(entry);
			if (normalized) {
				commonPasswords.add(normalized);
				maxPasswordLength = Math.max(maxPasswordLength, normalized.length);
			}
		}
		start = end + 1;
	}

	if (!commonPasswords.size) {
		throw new Error("The list contained no usable entries.");
	}
	text = "";
	self.postMessage({ type: "ready", count: entryCount });
}

function comparePassword(id, password) {
	const compact = compactPassword(password);
	const reversed = [...compact].reverse().join("");
	const exact = commonPasswords.has(compact) || commonPasswords.has(reversed);
	const matches = new Set();
	if (exact) {
		matches.add(commonPasswords.has(compact) ? compact : reversed);
	}

	for (let start = 0; start < compact.length; start += 1) {
		const maxEnd = Math.min(compact.length, start + maxPasswordLength);
		for (let end = start + MIN_MATCH_LENGTH; end <= maxEnd; end += 1) {
			const fragment = compact.slice(start, end);
			if (commonPasswords.has(fragment)) {
				matches.add(fragment);
			}
			const reversedFragment = reversed.slice(compact.length - end, compact.length - start);
			if (commonPasswords.has(reversedFragment)) {
				matches.add(reversedFragment);
			}
		}
	}

	const samples = [...matches].slice(0, 5).join(", ");
	self.postMessage({
		id,
		exact,
		match_count: matches.size,
		samples,
	});
}

self.onmessage = (event) => {
	const { id, password } = event.data;
	if (typeof password !== "string") {
		return;
	}
	comparePassword(id, password);
};

loadCommonPasswords().catch(error => {
	self.postMessage({ type: "error", message: error.message });
});
