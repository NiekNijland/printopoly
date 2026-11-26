<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

/**
 * A migration that ran in production is history: it names no application class, because a class that moves or is deleted must not break a migration
 * that has run.
 */
final readonly class MigrationClassGuard
{
    /**
     * @param string $folder the migration folder, relative to the root
     * @param string $applicationNamespace the root namespace of the application, with one trailing backslash
     */
    public function __construct(
        private PhpFileInspector $inspector,
        private string $root,
        private string $folder,
        private string $applicationNamespace,
    ) {
    }

    /**
     * @return list<string>
     */
    public function violations(): array
    {
        $files = $this->inspector->phpFiles($this->root . '/' . $this->folder);
        $violations = [];

        foreach ($files as $file) {
            foreach ($this->inSource((string) file_get_contents($file)) as $message) {
                $violations[] = mb_substr($file, mb_strlen($this->root) + 1) . ': ' . $message;
            }
        }

        return $violations;
    }

    /**
     * @return list<string>
     */
    public function inSource(string $source): array
    {
        $messages = [];

        if (preg_match('/(?<![A-Za-z0-9_])' . preg_quote($this->applicationNamespace, '/') . '/', $source) === 1) {
            $messages[] = 'a migration names an application class: write the table, the column and the value as they are, so a move of the class cannot break a migration that has run';
        }

        return $messages;
    }
}
