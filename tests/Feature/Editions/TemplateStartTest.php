<?php

declare(strict_types=1);

namespace Tests\Feature\Editions;

use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

/**
 * Starting points for a new edition (B124): the page gets the chosen template id from the query
 * and the browser decides what it means.
 */
final class TemplateStartTest extends TestCase
{
    public function test_the_new_edition_page_passes_the_template_from_the_query(): void
    {
        $this->get('/nl/editions/new?template=wedding')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
                ->component('editions/create')
                ->where('template', 'wedding'));
    }

    public function test_the_new_edition_page_starts_blank_without_a_template(): void
    {
        $this->get('/nl/editions/new')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
                ->component('editions/create')
                ->where('template', null));
    }

    public function test_the_sample_page_passes_the_template_from_the_query(): void
    {
        $this->get('/en/editions/sample?template=village')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
                ->component('editions/sample')
                ->where('template', 'village'));
    }

    public function test_a_list_in_the_query_is_ignored(): void
    {
        $this->get('/nl/editions/sample?template[]=village')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
                ->where('template', null));
    }
}
