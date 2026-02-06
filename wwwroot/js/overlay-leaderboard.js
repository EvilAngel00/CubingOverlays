function calculateAverage(solves) {
    if (solves.length < 3) return null;
    const times = solves
        .filter(s => s.penalty !== "dnf")
        .map(s => s.penalty === "+2" ? s.time + 2 : s.time)
        .sort((a, b) => a - b);

    return times.slice(1, -1)
        .reduce((a, b) => a + b, 0) / (times.length - 2);
}