export { createChart, createPage, createStory } from './scrollylite.js';
export { story, StoryBuilder } from './grammar/story.js';
export { seq, Seq } from './seq.js';
import { createChart, createPage, createStory } from './scrollylite.js';
import { Seq as SeqClass } from './seq.js';
function resolveSpec(input) {
    return input instanceof SeqClass ? input.toSpec() : input;
}
export async function chart(specOrSeq, options) {
    const runtime = await createChart(resolveSpec(specOrSeq), options);
    if (specOrSeq instanceof SeqClass && specOrSeq.length > 0) {
        const initialStep = typeof options['initialStep'] === 'number' ? options['initialStep'] : 0;
        specOrSeq.syncCursor(initialStep);
    }
    return runtime;
}
export async function render(specOrSeq, options) {
    const runtime = await createStory(resolveSpec(specOrSeq), options);
    if (specOrSeq instanceof SeqClass && specOrSeq.length > 0)
        specOrSeq.syncCursor(0);
    return runtime;
}
export function page(specOrSeq, options = {}) {
    return createPage(resolveSpec(specOrSeq), options);
}
