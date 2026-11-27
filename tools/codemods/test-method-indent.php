<?php

declare(strict_types=1);

// Moves a method of a test class that stands on eight spaces, with its opening brace, back to four (ratchet row
// test-method-indent). The body already stands on eight. A second run changes nothing. Run from the root:
// php tools/codemods/test-method-indent.php

$files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator('tests', FilesystemIterator::SKIP_DOTS));

foreach ($files as $file) {
    if ($file->getExtension() !== 'php') {
        continue;
    }

    $source = (string) file_get_contents($file->getPathname());
    $fixed = (string) preg_replace('/^        ((?:public|private|protected)(?: static)? function [^\n]*)\n        \{$/m', "    $1\n    {", $source);

    if ($fixed !== $source) {
        file_put_contents($file->getPathname(), $fixed);
    }
}
