import { llmService } from "./sercices/llm.service";
import { searchService } from "./sercices/search.service";

export async function parseQuery(query: string): Promise<string> {
    const rephrased = await llmService.rephrase(query);
    const newquery = rephrased.completion;
    console.log('Search query:', newquery);
    const results = await searchService.getSearchResults(newquery);

    if (results.length > 0) {
        console.log('Search results:', results.length);
        await Promise.all(results.map(async (result) => {
            try {
                if (result.description.length > 2000) {
                    result.description = await llmService.summarize(result.description);
                }
            }
            catch (e) {
                console.warn(`Unable to load ${result.url}`);
            }
            return result;
        }));
        const searchPrompt = `
Your task is to provide a summary of the search results.

# Results
${results.map((result, index) => `
##[${index + 1}] ${result.title} (retrieved from ${result.url})
${result.description}

`).join('\n')}


# Rules
1. You may augment with your own knowledge - but if so you MUST be clear it is not from a search result.
2. Each time you use information from a search result, annotate your output with a citation of the search result used at that point in your output.
E.g. to annotate text "mary had a little lamb" for citations from search results 1 and 4 you would write "mary had a little lamb [1],[4]".
3. At the end of your summary, provide a bullet-list of the search results used as citations formatted as markdown links.
E.g. you for result 1 you would write "1. [title of webpage](url of webpage)" replacing the title and url.
4. Your summary must not exceed 1000 words (3000 tokens)
5. DO NOT REPEAT ANY OF THE SEARCH RESULTS IN YOUR SUMMARY.
6. DO NOT DIRECTLY REFER TO THE SEARCH RESULTS IN YOUR SUMMARY - write your summary as a stand alone article

Your summary:
`;
console.log(searchPrompt);
        const response = await llmService.generate(searchPrompt);
        return response.completion;
    }
    return "No results found.";
}