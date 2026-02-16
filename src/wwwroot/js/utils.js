export function formatSolve(solve) {
    if (!solve) return "—";
    if (solve.penalty === "dnf") return "DNF";
    return solve.time.toFixed(2);
}

export function getOrdinal(n) {
    if (!n) return "--";
    const s = ["th", "st", "nd", "rd"],
        v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function getBestSolve(solves) {
    if (!solves || solves.length === 0) return Infinity;
    return Math.min(...solves.map(s => (s.penalty === "dnf" ? Infinity : s.time)));
}