import path from 'node:path';

export const SOURCE = 'resources/js';

export const fromSource = (context) =>
    path
        .relative(path.join(context.cwd, SOURCE), context.filename)
        .split(path.sep);
