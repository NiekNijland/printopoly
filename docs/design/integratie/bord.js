// Tekent een eenvoudig Klassiek-bord als SVG in elk element met data-board.
// data-board="naam", data-size in px, data-sel = positie 0..39 om te markeren.
(function () {
    const groups = {
        1: '#955436', 3: '#955436', 6: '#AAE0FA', 8: '#AAE0FA', 9: '#AAE0FA',
        11: '#D93A96', 13: '#D93A96', 14: '#D93A96', 16: '#F7941D', 18: '#F7941D', 19: '#F7941D',
        21: '#ED1B24', 23: '#ED1B24', 24: '#ED1B24', 26: '#FEF200', 27: '#FEF200', 29: '#FEF200',
        31: '#1FB25A', 32: '#1FB25A', 34: '#1FB25A', 37: '#0072BB', 39: '#0072BB',
    };
    const chance = [7, 22, 36];
    const chest = [2, 17, 33];
    function draw(el) {
        const size = Number(el.dataset.size || 300);
        const name = el.dataset.board || 'Onze editie';
        const sel = el.dataset.sel === undefined ? -1 : Number(el.dataset.sel);
        const theme = el.dataset.theme || 'klassiek';
        const bg = theme === 'riso' ? '#FCE9F2' : theme === 'strak' ? '#FFFFFF' : '#D4E9D7';
        const plate = theme === 'riso' ? '#E6007E' : theme === 'strak' ? '#1B1F24' : '#FFD84D';
        const plateText = theme === 'klassiek' ? '#1B1F24' : '#FFFFFF';
        const c = size * 0.13; // hoek
        const s = (size - 2 * c) / 9; // vak
        const bar = c * 0.22;
        let out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="display:block">`;
        out += `<rect width="${size}" height="${size}" fill="${bg}" stroke="#1B1F24" stroke-width="1.5"/>`;
        const rect = (x, y, w, h, fill, stroke = 'rgba(27,31,36,.45)', sw = 0.6) =>
            `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
        for (let p = 0; p < 40; p++) {
            let x, y, w, h, bx, by, bw, bh;
            const side = Math.floor(p / 10);
            const i = p % 10;
            if (i === 0) {
                const pos = [[size - c, size - c], [0, size - c], [0, 0], [size - c, 0]][side];
                out += rect(pos[0], pos[1], c, c, theme === 'klassiek' ? '#C5DFC9' : bg);
                if (p === sel) out += rect(pos[0] + 1, pos[1] + 1, c - 2, c - 2, 'none', '#C8321F', 3);
                continue;
            }
            if (side === 0) { x = size - c - i * s; y = size - c; w = s; h = c; bx = x; by = y; bw = s; bh = bar; }
            if (side === 1) { x = 0; y = size - c - i * s; w = c; h = s; bx = c - bar; by = y; bw = bar; bh = s; }
            if (side === 2) { x = c + (i - 1) * s; y = 0; w = s; h = c; bx = x; by = c - bar; bw = s; bh = bar; }
            if (side === 3) { x = size - c; y = c + (i - 1) * s; w = c; h = s; bx = x; by = y; bw = bar; bh = s; }
            const fill = chance.includes(p) ? '#CCEDF9' : chest.includes(p) ? '#FACCE5' : bg;
            out += rect(x, y, w, h, fill);
            if (groups[p]) out += rect(bx, by, bw, bh, groups[p]);
            if (p === sel) out += rect(x + 1, y + 1, w - 2, h - 2, 'none', '#C8321F', 3);
        }
        const mid = size / 2;
        const pw = size * 0.56, ph = size * 0.1;
        out += `<g transform="rotate(-45 ${mid} ${mid})">`;
        out += `<rect x="${mid - pw / 2}" y="${mid - ph / 2}" width="${pw}" height="${ph}" fill="${plate}" stroke="#1B1F24" stroke-width="${Math.max(1, size / 200)}"/>`;
        out += `<text x="${mid}" y="${mid + ph * 0.18}" text-anchor="middle" font-family="League Spartan, sans-serif" font-weight="800" font-size="${ph * 0.5}" fill="${plateText}">${name}</text>`;
        out += `</g>`;
        out += `<rect x="${size * 0.24}" y="${size * 0.24}" width="${size * 0.14}" height="${size * 0.1}" transform="rotate(-45 ${size * 0.31} ${size * 0.29})" fill="#FACCE5" stroke="rgba(27,31,36,.4)"/>`;
        out += `<rect x="${size * 0.62}" y="${size * 0.66}" width="${size * 0.14}" height="${size * 0.1}" transform="rotate(-45 ${size * 0.69} ${size * 0.71})" fill="#CCEDF9" stroke="rgba(27,31,36,.4)"/>`;
        out += `</svg>`;
        el.innerHTML = out;
    }
    document.querySelectorAll('[data-board]').forEach(draw);
})();
